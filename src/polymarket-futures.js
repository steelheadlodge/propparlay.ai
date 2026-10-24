// Free championship futures from Polymarket's public Gamma API (no key, reachable
// from Cloudflare's edge, unlike ESPN's core API). Each team is a Yes/No market
// whose Yes price is the crowd's win probability, so the board is fair odds with
// no sportsbook vig.

import { cachedFetchJson, getLeagueTeams, normName } from "./espn-teams.js";

const GAMMA = "https://gamma-api.polymarket.com";

// Keys match The Odds API outright keys so shared parlay links stay stable
// whichever source served the board. Polymarket slugs carry timestamps, so
// events are found by search + title pattern rather than a fixed slug.
const CHAMPION_MARKETS = [
  { league: "NFL", key: "americanfootball_nfl_super_bowl_winner", title: "Super Bowl Winner", q: "pro football champion", match: /^Pro Football: \d{4} Champion$/i },
  { league: "MLB", key: "baseball_mlb_world_series_winner", title: "World Series Winner", q: "world series champion", match: /^MLB World Series Champion \d{4}$/i },
  { league: "NBA", key: "basketball_nba_championship_winner", title: "Championship Winner", q: "nba champion", match: /^NBA: \d{4} Champion$/i },
  { league: "NHL", key: "icehockey_nhl_championship_winner", title: "Stanley Cup Winner", q: "nhl champion", match: /^NHL: \d{4} Champion$/i },
  { league: "NCAAF", key: "americanfootball_ncaaf_championship_winner", title: "Championship Winner", q: "ncaa football national champion", match: /^NCAA Football: \d{4} National Champion$/i },
];

// Polymarket labels that differ from every ESPN name variant.
const NAME_ALIASES = {
  "mississippi rebels": "ole miss rebels",
};

const MIN_FIELD = 8;
const MAX_OUTCOMES = 64;
// Yes prices below this are dead contracts (eliminated teams, 0.1¢ asks).
const MIN_PRICE = 0.002;

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Midpoint of the live book when it's tight; otherwise the last trade.
function yesPrice(m) {
  const bid = num(m.bestBid);
  const ask = num(m.bestAsk);
  if (bid != null && ask != null && ask > 0 && ask - bid <= 0.05) return (bid + ask) / 2;
  const last = num(m.lastTradePrice);
  if (last != null && last > 0) return last;
  try {
    return num(JSON.parse(m.outcomePrices ?? "[]")[0]);
  } catch {
    return null;
  }
}

function toAmerican(p) {
  if (p >= 0.5) return -Math.round((100 * p) / (1 - p));
  return Math.round((100 * (1 - p)) / p);
}

function liveMarkets(event) {
  return (event?.markets ?? [])
    .filter((m) => m.active !== false && !m.closed)
    .map((m) => ({ m, p: yesPrice(m) }))
    .filter(({ m, p }) => p != null && p >= MIN_PRICE && m.groupItemTitle);
}

// Several seasons can be open at once (e.g. this year's World Series during the
// playoffs and next year's in the offseason); take the one with the widest live
// field so the grid has teams to cross.
async function findEvent(def) {
  const search = await cachedFetchJson(
    `poly:search:${def.league}:v1`,
    6 * 60 * 60,
    `${GAMMA}/public-search?q=${encodeURIComponent(def.q)}&limit_per_type=10&events_status=active`,
    6000,
  );
  const slugs = (search?.events ?? [])
    .filter((e) => def.match.test((e.title ?? "").trim()) && !e.closed)
    .map((e) => e.slug);

  let best = null;
  for (const slug of slugs) {
    const list = await cachedFetchJson(
      `poly:event:${slug}:v1`,
      3 * 60 * 60,
      `${GAMMA}/events?slug=${encodeURIComponent(slug)}`,
      6000,
    );
    const event = Array.isArray(list) ? list[0] : null;
    const live = liveMarkets(event);
    if (live.length >= MIN_FIELD && (!best || live.length > best.live.length)) {
      best = { event, live };
    }
  }
  return best;
}

async function buildMarket(def) {
  const [found, teams] = await Promise.all([
    findEvent(def),
    getLeagueTeams(def.league).catch(() => null),
  ]);
  if (!found) return null;

  const fieldSum = found.live.reduce((s, r) => s + r.p, 0) || 1;
  const outcomes = found.live
    .map(({ m, p }) => {
      const name = m.groupItemTitle.trim();
      const key = normName(name);
      const team = teams?.byName.get(NAME_ALIASES[key] ?? key) ?? null;
      return {
        name: team?.fullName ?? name,
        displayName: team?.nick ?? name,
        abbr: team?.abbr ?? null,
        logo: team?.logo ?? null,
        price: toAmerican(p),
        book: "Polymarket",
        fairPct: Math.round((p / fieldSum) * 1000) / 10,
        books: 1,
      };
    })
    .sort((a, b) => b.fairPct - a.fairPct)
    .slice(0, MAX_OUTCOMES);

  return {
    key: def.key,
    league: def.league,
    title: def.title,
    description: "",
    outcomes,
  };
}

export async function getPolymarketFutures() {
  const settled = await Promise.allSettled(CHAMPION_MARKETS.map(buildMarket));
  return settled
    .filter((r) => r.status === "fulfilled" && r.value)
    .map((r) => r.value);
}
