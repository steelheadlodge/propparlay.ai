// Futures board — championship / conference / division / win-total / award
// markets across NFL, MLB, NBA, NHL. Markets are discovered dynamically from
// The Odds API "sports" catalog (free) so the board adapts to whatever each
// book has posted for the current season.
//
// Quota note: each market costs 1 Odds API credit. Futures move slowly, so the
// /api/futures route caches for 12h — a handful of credits per day.

import { ODDS_BASE, oddsFetch, getOddsQuota } from "./odds.js";
import { normName, getLeagueTeams } from "./espn-teams.js";

// Map an Odds API sport key prefix to our league label.
const LEAGUE_BY_PREFIX = [
  ["americanfootball_nfl", "NFL"],
  ["baseball_mlb", "MLB"],
  ["basketball_nba", "NBA"],
  ["icehockey_nhl", "NHL"],
];

// Safety cap on markets fetched per build to protect the request quota.
const MAX_MARKETS = 24;
// Trim very large outright fields (e.g. 40-team MVP races) for a lean payload.
const MAX_OUTCOMES = 14;

function leagueForKey(key) {
  for (const [prefix, league] of LEAGUE_BY_PREFIX) {
    if (key.startsWith(prefix)) return league;
  }
  return null;
}

function impliedProb(odds) {
  return odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
}

// Clean "NFL Super Bowl Winner 2025/2026" style titles into a short label.
function shortTitle(title, league) {
  let t = (title ?? "").trim();
  if (league && t.startsWith(league + " ")) t = t.slice(league.length + 1);
  return t || title || "Futures";
}

async function fetchCatalog(apiKey) {
  const res = await oddsFetch(`${ODDS_BASE}/sports?apiKey=${apiKey}`, 6000);
  if (!res.ok) throw new Error(`Odds catalog HTTP ${res.status}`);
  const json = await res.json();
  return (Array.isArray(json) ? json : []).filter((s) => {
    if (!s?.has_outrights || s?.active === false) return false;
    return leagueForKey(s.key) != null;
  });
}

async function fetchMarket(apiKey, sport, teams) {
  const url =
    `${ODDS_BASE}/sports/${sport.key}/odds?apiKey=${apiKey}` +
    `&regions=us&markets=outrights&oddsFormat=american`;
  const res = await oddsFetch(url, 7000);
  if (!res.ok) return null;
  const json = await res.json();
  const event = Array.isArray(json) ? json[0] : null;
  if (!event) return null;

  // Collect every book's outright prices keyed by outcome name.
  const prices = new Map();
  for (const b of event.bookmakers ?? []) {
    const market = b.markets?.find((m) => m.key === "outrights");
    for (const o of market?.outcomes ?? []) {
      if (typeof o.price !== "number") continue;
      if (!prices.has(o.name)) prices.set(o.name, []);
      prices.get(o.name).push({ price: o.price, book: b.title });
    }
  }
  if (prices.size === 0) return null;

  const league = leagueForKey(sport.key);
  const rows = [];
  for (const [name, list] of prices) {
    const best = list.reduce((m, p) => (p.price > m.price ? p : m));
    const consensus =
      list.reduce((s, p) => s + impliedProb(p.price), 0) / list.length;
    rows.push({ name, best, consensus });
  }
  const fieldSum = rows.reduce((s, r) => s + r.consensus, 0) || 1;

  const outcomes = rows
    .map((r) => {
      const team = teams?.byName.get(normName(r.name)) ?? null;
      return {
        name: r.name,
        abbr: team?.abbr ?? null,
        logo: team?.logo ?? null,
        price: r.best.price,
        book: r.best.book,
        fairPct: Math.round((r.consensus / fieldSum) * 1000) / 10,
        books: distinctBooks(prices.get(r.name)),
      };
    })
    .sort((a, b) => b.fairPct - a.fairPct)
    .slice(0, MAX_OUTCOMES);

  return {
    key: sport.key,
    league,
    title: shortTitle(sport.title, league),
    description: sport.description ?? "",
    outcomes,
  };
}

function distinctBooks(arr) {
  return Array.isArray(arr) ? new Set(arr.map((p) => p.book)).size : 0;
}

export async function getFutures(env) {
  const apiKey = env.ODDS_API_KEY;
  if (!apiKey) return { configured: false, markets: [], quota: null };

  let catalog;
  try {
    catalog = await fetchCatalog(apiKey);
  } catch (err) {
    return { configured: true, markets: [], quota: getOddsQuota(), error: "catalog" };
  }

  // Order leagues so in-season futures (MLB now) surface first, and cap total.
  const LEAGUE_ORDER = { MLB: 0, NFL: 1, NBA: 2, NHL: 3 };
  catalog.sort(
    (a, b) =>
      (LEAGUE_ORDER[leagueForKey(a.key)] ?? 9) -
      (LEAGUE_ORDER[leagueForKey(b.key)] ?? 9),
  );
  const selected = catalog.slice(0, MAX_MARKETS);

  // Preload ESPN team maps for the leagues we'll show (free, cached).
  const leagues = [...new Set(selected.map((s) => leagueForKey(s.key)))];
  const teamMaps = new Map();
  await Promise.all(
    leagues.map(async (lg) => {
      teamMaps.set(lg, await getLeagueTeams(lg).catch(() => null));
    }),
  );

  const settled = await Promise.allSettled(
    selected.map((s) => fetchMarket(apiKey, s, teamMaps.get(leagueForKey(s.key)))),
  );
  const markets = [];
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value && r.value.outcomes.length) {
      markets.push(r.value);
    }
  }

  return { configured: true, markets, quota: getOddsQuota() };
}
