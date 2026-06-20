// The Odds API proxy — https://the-odds-api.com
// Key-gated: set ODDS_API_KEY as a Worker secret to enable. Without a key the
// endpoints return { configured: false } so the app falls back to model picks.

const BASE = "https://api.the-odds-api.com/v4";

const SPORT_KEYS = {
  NBA: "basketball_nba",
  NHL: "icehockey_nhl",
  NFL: "americanfootball_nfl",
  MLB: "baseball_mlb",
};

// Player-prop market keys per sport (used on the per-event odds endpoint).
export const PROP_MARKETS = {
  NBA: ["player_points", "player_rebounds", "player_assists"],
  NHL: ["player_points", "player_shots_on_goal"],
  NFL: ["player_pass_yds", "player_rush_yds", "player_reception_yds"],
  MLB: ["batter_total_bases", "batter_hits", "batter_home_runs"],
};

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function bestPrice(outcomes) {
  // Highest American price across books for a given outcome name.
  return outcomes.reduce(
    (best, o) => (best == null || o.price > best.price ? o : best),
    null,
  );
}

function normalizeGameOdds(event, league) {
  const books = event.bookmakers ?? [];
  const h2hOutcomes = [];
  for (const b of books) {
    const market = b.markets?.find((m) => m.key === "h2h");
    for (const o of market?.outcomes ?? []) {
      h2hOutcomes.push({ ...o, book: b.title });
    }
  }
  const homeName = event.home_team;
  const awayName = event.away_team;
  const homeBest = bestPrice(h2hOutcomes.filter((o) => o.name === homeName));
  const awayBest = bestPrice(h2hOutcomes.filter((o) => o.name === awayName));

  return {
    id: event.id,
    league,
    home: homeName,
    away: awayName,
    commenceMs: event.commence_time
      ? new Date(event.commence_time).getTime()
      : null,
    moneyline: {
      home: homeBest ? { price: homeBest.price, book: homeBest.book } : null,
      away: awayBest ? { price: awayBest.price, book: awayBest.book } : null,
    },
  };
}

async function fetchSportOdds(sportKey, league, apiKey) {
  const url =
    `${BASE}/sports/${sportKey}/odds?apiKey=${apiKey}` +
    `&regions=us&markets=h2h&oddsFormat=american`;
  const res = await fetchWithTimeout(url, 6000);
  if (!res.ok) {
    throw new Error(`OddsAPI ${league} HTTP ${res.status}`);
  }
  const json = await res.json();
  return (Array.isArray(json) ? json : []).map((e) =>
    normalizeGameOdds(e, league),
  );
}

// Game-level moneyline odds across NBA/NHL/NFL/MLB. Cheap on quota (4 calls).
export async function getGameOdds(env) {
  const apiKey = env.ODDS_API_KEY;
  if (!apiKey) return { configured: false, events: [] };

  const settled = await Promise.allSettled(
    Object.entries(SPORT_KEYS).map(([league, key]) =>
      fetchSportOdds(key, league, apiKey),
    ),
  );
  const events = [];
  for (const r of settled) {
    if (r.status === "fulfilled") events.push(...r.value);
  }
  return { configured: true, events };
}

// Player props for a single event. Heavier on quota (one call per event), so
// the app requests these on demand rather than on every load.
export async function getPlayerProps(env, sportKey, eventId) {
  const apiKey = env.ODDS_API_KEY;
  if (!apiKey) return { configured: false, props: [] };

  const league = Object.keys(SPORT_KEYS).find((k) => SPORT_KEYS[k] === sportKey);
  const markets = (PROP_MARKETS[league] ?? []).join(",");
  if (!markets) return { configured: true, props: [] };

  const url =
    `${BASE}/sports/${sportKey}/events/${eventId}/odds?apiKey=${apiKey}` +
    `&regions=us&markets=${markets}&oddsFormat=american`;
  const res = await fetchWithTimeout(url, 7000);
  if (!res.ok) throw new Error(`OddsAPI props HTTP ${res.status}`);
  const json = await res.json();

  const props = [];
  for (const b of json.bookmakers ?? []) {
    for (const m of b.markets ?? []) {
      for (const o of m.outcomes ?? []) {
        props.push({
          market: m.key,
          player: o.description ?? o.name,
          side: o.name,
          line: o.point ?? null,
          price: o.price,
          book: b.title,
        });
      }
    }
  }
  return { configured: true, props };
}

export { SPORT_KEYS };
