// Live prop slate — turns The Odds API player props into ready-to-render cards.
//
// Quota-safe by design: caps the number of games we pull props for, and the
// /api/slate route caches the result for 15 minutes. ESPN team/roster lookups
// (for logos + headshots) are free and cached aggressively.

import { getGameOdds, getPlayerProps, getOddsQuota, SPORT_KEYS } from "./odds.js";

// Cap on games we fetch player props for per slate build. Each game costs
// ~3 Odds API credits (one per market), so 6 games ≈ 18 credits per cold build.
const MAX_EVENTS = 6;
// Final number of cards surfaced, ranked by confidence.
const MAX_CARDS = 15;
// Confidence band (de-vigged consensus %). Skip near-coinflips and near-locks
// so the slate shows meaningful, parlay-worthy reads rather than chalk or noise.
const MIN_CONFIDENCE = 55;
const MAX_CONFIDENCE = 93;
// Show the value badge only when a book genuinely beats the consensus.
const VALUE_EDGE = 0.75;

const ESPN_PATH = {
  NBA: "basketball/nba",
  NHL: "hockey/nhl",
  NFL: "football/nfl",
  MLB: "baseball/mlb",
};

// Odds API market key -> display label, short unit, and hot-zone row.
const MARKET_META = {
  player_points: { label: "Points", unit: "pts", zone: "scoring" },
  player_rebounds: { label: "Rebounds", unit: "reb", zone: "volume" },
  player_assists: { label: "Assists", unit: "ast", zone: "playmaking" },
  player_shots_on_goal: { label: "Shots on Goal", unit: "SOG", zone: "volume" },
  player_pass_yds: { label: "Passing Yards", unit: "yds", zone: "volume" },
  player_rush_yds: { label: "Rushing Yards", unit: "yds", zone: "volume" },
  player_reception_yds: { label: "Receiving Yards", unit: "yds", zone: "volume" },
  batter_total_bases: { label: "Total Bases", unit: "bases", zone: "scoring" },
  batter_hits: { label: "Hits", unit: "hits", zone: "volume" },
  batter_home_runs: { label: "Home Runs", unit: "HR", zone: "scoring" },
};

function americanToDecimal(odds) {
  return odds > 0 ? odds / 100 + 1 : 100 / -odds + 1;
}

function impliedProb(odds) {
  return odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
}

function normName(s) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Edge-cached JSON fetch for the free ESPN endpoints (teams, rosters).
async function cachedFetchJson(cacheKey, ttlSeconds, url, ms) {
  const cache = caches.default;
  const req = new Request(`https://cache.propparlay.ai/${cacheKey}`);
  const hit = await cache.match(req);
  if (hit) return await hit.json();
  const data = await fetchJson(url, ms);
  if (data == null) return null;
  const res = new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${ttlSeconds}` },
  });
  await cache.put(req, res.clone());
  return data;
}

// league -> { byName: Map(normName -> {abbr, logo}), abbrLogo: Map }
async function getLeagueTeams(league) {
  const path = ESPN_PATH[league];
  if (!path) return null;
  const json = await cachedFetchJson(
    `espn:teams:${league}:v1`,
    24 * 60 * 60,
    `https://site.api.espn.com/apis/site/v2/sports/${path}/teams`,
    5000,
  );
  const teams = json?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  const byName = new Map();
  const abbrLogo = new Map();
  for (const t of teams) {
    const team = t.team ?? {};
    const abbr = (team.abbreviation ?? "").toUpperCase();
    const logo = team.logos?.[0]?.href ?? null;
    if (!abbr) continue;
    abbrLogo.set(abbr, logo);
    for (const n of [team.displayName, team.shortDisplayName, team.name, team.nickname]) {
      if (n) byName.set(normName(n), { abbr, logo });
    }
  }
  return { byName, abbrLogo };
}

// teamAbbr -> Map(normName -> headshotUrl)
async function getRosterHeadshots(league, abbr) {
  const path = ESPN_PATH[league];
  if (!path || !abbr) return new Map();
  const json = await cachedFetchJson(
    `espn:roster:${league}:${abbr}:v1`,
    12 * 60 * 60,
    `https://site.api.espn.com/apis/site/v2/sports/${path}/teams/${abbr.toLowerCase()}/roster`,
    5000,
  );
  const map = new Map();
  const groups = json?.athletes ?? [];
  const flat = [];
  for (const g of groups) {
    if (Array.isArray(g?.items)) flat.push(...g.items);
    else if (g?.fullName) flat.push(g);
  }
  for (const a of flat) {
    const href = a?.headshot?.href ?? null;
    if (a?.fullName && href) map.set(normName(a.fullName), href);
  }
  return map;
}

// Group raw prop rows into player+market+line buckets with over/under prices.
function bucketProps(rows) {
  const buckets = new Map();
  for (const r of rows) {
    if (r.line == null || typeof r.price !== "number") continue;
    const key = `${normName(r.player)}|${r.market}|${r.line}`;
    let b = buckets.get(key);
    if (!b) {
      b = { player: r.player, market: r.market, line: r.line, over: [], under: [] };
      buckets.set(key, b);
    }
    const side = (r.side ?? "").toLowerCase();
    if (side === "over") b.over.push({ book: r.book, price: r.price });
    else if (side === "under") b.under.push({ book: r.book, price: r.price });
  }
  return [...buckets.values()];
}

// De-vigged market consensus for a bucket. We recommend the side the market
// favors (higher fair probability) and report that probability as confidence.
// `edge` is the true line-shopping value: the EV of the best available price
// evaluated at the consensus fair probability (positive = a book is paying
// more than the market thinks the outcome is worth).
function analyzeBucket(b) {
  if (b.over.length === 0 || b.under.length === 0) return null;
  const overByBook = new Map(b.over.map((o) => [o.book, o.price]));
  const underByBook = new Map(b.under.map((u) => [u.book, u.price]));
  const fairOvers = [];
  for (const [book, op] of overByBook) {
    const up = underByBook.get(book);
    if (up == null) continue;
    const po = impliedProb(op);
    const pu = impliedProb(up);
    const sum = po + pu;
    if (sum > 0) fairOvers.push(po / sum);
  }
  if (fairOvers.length === 0) return null;
  const fairOver = fairOvers.reduce((a, c) => a + c, 0) / fairOvers.length;
  const fairUnder = 1 - fairOver;

  const overFavored = fairOver >= fairUnder;
  const fair = overFavored ? fairOver : fairUnder;
  const prices = overFavored ? b.over : b.under;
  const best = prices.reduce((m, p) => (p.price > m.price ? p : m));
  const edge = (americanToDecimal(best.price) * fair - 1) * 100;
  // Distinct books pricing this market — a proxy for liquidity. Lines quoted by
  // several books are real, set-lineup props; one-book lines are often bench /
  // prospect juice and get deprioritized.
  const bookCount = new Set([...b.over, ...b.under].map((p) => p.book)).size;

  return {
    side: overFavored ? "over" : "under",
    confidence: fair * 100,
    edge,
    bookCount,
    prices,
  };
}

function pickEventsForProps(events) {
  const now = Date.now();
  const upcoming = events
    .filter((e) => e.commenceMs == null || e.commenceMs > now - 3 * 60 * 60 * 1000)
    .sort((a, b) => (a.commenceMs ?? 0) - (b.commenceMs ?? 0));
  // Spread across leagues so the slate isn't all one sport.
  const byLeague = new Map();
  for (const e of upcoming) {
    if (!byLeague.has(e.league)) byLeague.set(e.league, []);
    byLeague.get(e.league).push(e);
  }
  const out = [];
  let added = true;
  while (added && out.length < MAX_EVENTS) {
    added = false;
    for (const list of byLeague.values()) {
      if (list.length && out.length < MAX_EVENTS) {
        out.push(list.shift());
        added = true;
      }
    }
  }
  return out;
}

async function buildEventCards(env, event) {
  const sportKey = SPORT_KEYS[event.league];
  if (!sportKey) return [];
  const [propsRes, teams] = await Promise.all([
    getPlayerProps(env, sportKey, event.id),
    getLeagueTeams(event.league),
  ]);
  const rows = propsRes.props ?? [];
  if (rows.length === 0) return [];

  const homeAbbr = teams?.byName.get(normName(event.home))?.abbr ?? "";
  const awayAbbr = teams?.byName.get(normName(event.away))?.abbr ?? "";
  const [homeRoster, awayRoster] = await Promise.all([
    getRosterHeadshots(event.league, homeAbbr),
    getRosterHeadshots(event.league, awayAbbr),
  ]);

  const cards = [];
  for (const b of bucketProps(rows)) {
    const a = analyzeBucket(b);
    if (!a) continue;
    if (a.confidence < MIN_CONFIDENCE || a.confidence > MAX_CONFIDENCE) continue;
    const meta = MARKET_META[b.market] ?? { label: b.market, unit: "", zone: "volume" };

    const nm = normName(b.player);
    let team = "";
    let opponent = "";
    let headshot = null;
    if (homeRoster.has(nm)) {
      team = homeAbbr;
      opponent = awayAbbr;
      headshot = homeRoster.get(nm);
    } else if (awayRoster.has(nm)) {
      team = awayAbbr;
      opponent = homeAbbr;
      headshot = awayRoster.get(nm);
    } else {
      team = homeAbbr;
      opponent = awayAbbr;
    }
    const logo = team ? teams?.abbrLogo.get(team) ?? null : null;

    const best = a.prices.reduce((m, p) => (p.price > m.price ? p : m));
    const books = a.prices
      .sort((x, y) => y.price - x.price)
      .slice(0, 4)
      .map((p) => ({
        book: p.book,
        line: `${a.side === "over" ? "O" : "U"} ${b.line}`,
        odds: p.price,
      }));

    cards.push({
      id: `${event.id}:${nm}:${b.market}:${b.line}`,
      bookCount: a.bookCount,
      market_key: b.market,
      player: b.player,
      team,
      opponent,
      teamLogo: logo,
      headshot,
      sport: event.league,
      market: meta.label,
      zone: meta.zone,
      gameTime: event.commenceMs
        ? new Date(event.commenceMs).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "America/New_York",
          })
        : "",
      aiProjection: b.line,
      projectionLabel: "Market line",
      unit: meta.unit,
      confidence: Math.round(a.confidence),
      edge: Math.round(a.edge * 10) / 10,
      recommendation: a.side,
      books,
      summary:
        a.edge >= VALUE_EDGE
          ? `Market consensus ${Math.round(a.confidence)}% on the ${a.side}. Best price ${best.price > 0 ? "+" : ""}${best.price} at ${best.book} pays ${(Math.round(a.edge * 10) / 10).toFixed(1)}% over fair value.`
          : `De-vigged market consensus puts the ${a.side} ${b.line} at ${Math.round(a.confidence)}%. Best available price ${best.price > 0 ? "+" : ""}${best.price} at ${best.book}.`,
    });
  }
  return cards;
}

export async function buildSlate(env) {
  if (!env.ODDS_API_KEY) {
    return { configured: false, props: [], quota: null };
  }

  const odds = await getGameOdds(env);
  const events = pickEventsForProps(odds.events ?? []);

  const settled = await Promise.allSettled(events.map((e) => buildEventCards(env, e)));
  const all = [];
  for (const r of settled) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  // One card per player — keep their highest-confidence market.
  const byPlayer = new Map();
  for (const c of all) {
    const key = c.player.toLowerCase();
    const prev = byPlayer.get(key);
    if (!prev || c.confidence > prev.confidence) byPlayer.set(key, c);
  }

  // Rank liquid (multi-book) props first, then by confidence. Liquid lines are
  // set-lineup props for players who'll actually play; single-book lines are
  // often bench/prospect juice.
  const ranked = [...byPlayer.values()].sort(
    (a, b) => b.bookCount - a.bookCount || b.confidence - a.confidence,
  );

  // Diversify: cap cards per market so the slate isn't 15 of the same stat.
  const PER_MARKET_CAP = 4;
  const perMarket = new Map();
  const picked = [];
  for (const c of ranked) {
    if (picked.length >= MAX_CARDS) break;
    const n = perMarket.get(c.market_key) ?? 0;
    if (n >= PER_MARKET_CAP) continue;
    perMarket.set(c.market_key, n + 1);
    picked.push(c);
  }
  // Backfill if caps left us short of MAX_CARDS.
  if (picked.length < MAX_CARDS) {
    const have = new Set(picked.map((c) => c.id));
    for (const c of ranked) {
      if (picked.length >= MAX_CARDS) break;
      if (!have.has(c.id)) picked.push(c);
    }
  }

  // Strip internal-only fields before returning.
  const props = picked.map(({ bookCount, market_key, ...rest }) => rest);

  return {
    configured: true,
    props,
    quota: getOddsQuota(),
    events: events.length,
  };
}
