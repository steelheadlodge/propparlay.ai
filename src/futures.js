// Futures board — championship / conference / division / win-total / award
// markets across NFL, MLB, NBA, NHL. Markets are discovered dynamically from
// The Odds API "sports" catalog (free) so the board adapts to whatever each
// book has posted for the current season.
//
// Quota note: each market costs 1 Odds API credit. Futures move slowly, so the
// /api/futures route caches for 12h — a handful of credits per day.

import { ODDS_BASE, oddsFetch, getOddsQuota } from "./odds.js";
import { normName, getLeagueTeams } from "./espn-teams.js";

// Map an Odds API sport key prefix to our league label. Order matters: more
// specific soccer prefixes are matched before any generic ones.
const LEAGUE_BY_PREFIX = [
  ["americanfootball_nfl", "NFL"],
  ["americanfootball_ncaaf", "NCAAF"],
  ["baseball_mlb", "MLB"],
  ["basketball_nba", "NBA"],
  ["basketball_ncaab", "NCAAB"],
  ["icehockey_nhl", "NHL"],
  ["soccer_fifa_world_cup", "World Cup"],
  ["soccer_uefa_champs_league", "UCL"],
  ["soccer_uefa_europa", "Europa"],
  ["soccer_uefa_european_championship", "Euros"],
  ["soccer_epl", "EPL"],
  ["soccer_spain_la_liga", "La Liga"],
  ["soccer_italy_serie_a", "Serie A"],
  ["soccer_germany_bundesliga", "Bundesliga"],
  ["soccer_france_ligue_one", "Ligue 1"],
  ["soccer_usa_mls", "MLS"],
];

// Safety cap on markets fetched per build to protect the request quota.
// Each market costs 1 Odds API credit; the route caches for many hours.
const MAX_MARKETS = 14;
// Cap outright fields so payloads stay sane on huge markets (e.g. 48-nation
// World Cup, full MVP races) while still showing the entire realistic field.
const MAX_OUTCOMES = 64;

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
        // Team outcomes show the nickname (logo carries the city); player /
        // award outcomes keep their full name.
        displayName: team?.nick ?? r.name,
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

// Market-driven line movement: snapshot each outcome's "opening" best price in
// KV the first time we see it, then report how far the price has moved since.
// This is honest day-one data (it comes from the books, not our users) and only
// runs on a cache miss (~2x/day), so KV traffic is negligible.
const OPENS_KEY = "futures:opens";
const OPEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // re-baseline after 30 days
const MIN_MOVE_PTS = 0.5; // ignore sub-half-point noise

async function attachMovement(env, markets) {
  if (!env?.WAITLIST) return;

  let opens = {};
  try {
    const raw = await env.WAITLIST.get(OPENS_KEY);
    if (raw) opens = JSON.parse(raw);
  } catch {
    opens = {};
  }

  const now = Date.now();
  let changed = false;

  for (const m of markets) {
    for (const o of m.outcomes) {
      const key = `${m.key}|${o.name}`;
      const base = opens[key];

      if (!base || now - base.ts > OPEN_MAX_AGE_MS) {
        opens[key] = { price: o.price, ts: now };
        changed = true;
        continue; // first capture — no movement to show yet
      }

      if (base.price !== o.price) {
        // Movement in implied-probability points (positive = odds shortened).
        const pts =
          Math.round((impliedProb(o.price) - impliedProb(base.price)) * 1000) /
          10;
        if (Math.abs(pts) >= MIN_MOVE_PTS) {
          o.openPrice = base.price;
          o.move = pts > 0 ? "up" : "down";
          o.movePts = Math.abs(pts);
        }
      }
    }
  }

  if (changed) {
    try {
      await env.WAITLIST.put(OPENS_KEY, JSON.stringify(opens));
    } catch {
      /* best-effort snapshot */
    }
  }
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

  // Order leagues so the most timely / marquee futures surface first, and cap
  // the total fetched to protect the Odds API quota.
  const LEAGUE_ORDER = {
    "World Cup": 0,
    MLB: 1,
    NBA: 2,
    NHL: 3,
    NFL: 4,
    NCAAF: 5,
    NCAAB: 6,
    UCL: 7,
    EPL: 8,
    "La Liga": 9,
    "Serie A": 10,
    Bundesliga: 11,
    "Ligue 1": 12,
    Europa: 13,
    Euros: 14,
    MLS: 15,
  };
  catalog.sort(
    (a, b) =>
      (LEAGUE_ORDER[leagueForKey(a.key)] ?? 99) -
      (LEAGUE_ORDER[leagueForKey(b.key)] ?? 99),
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

  await attachMovement(env, markets).catch(() => {});

  return { configured: true, markets, quota: getOddsQuota() };
}
