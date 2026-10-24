// Free championship futures from ESPN's core API (DraftKings prices). Used when
// The Odds API returns nothing — e.g. the monthly credit quota is spent — so the
// grid never goes empty. One book only, so "fair %" is de-vigged across that
// book's field rather than a multi-book consensus.

import { ESPN_PATH, cachedFetchJson, getLeagueTeams } from "./espn-teams.js";

const CORE = "https://sports.core.api.espn.com/v2/sports";

// Keys match The Odds API outright keys so shared parlay links stay stable
// whichever source served the board.
const CHAMPION_MARKETS = [
  { league: "NFL", key: "americanfootball_nfl_super_bowl_winner", title: "Super Bowl Winner", match: /^super bowl winner$/i },
  { league: "MLB", key: "baseball_mlb_world_series_winner", title: "World Series Winner", match: /^world series winner$/i },
  { league: "NBA", key: "basketball_nba_championship_winner", title: "Championship Winner", match: /^nba championship winner$/i },
  { league: "NHL", key: "icehockey_nhl_championship_winner", title: "Stanley Cup Winner", match: /^stanley cup winner$/i },
  { league: "NCAAF", key: "americanfootball_ncaaf_championship_winner", title: "Championship Winner", match: /^national championship winner$/i },
];

// ESPN keeps last season's settled markets around with stale prices, so only
// read the league's current season — or next season once it's in the
// postseason/offseason (e.g. MLB in October lists next year's World Series).
const MIN_FIELD = 8;
const MAX_OUTCOMES = 64;

function parseAmerican(v) {
  const n = Number(String(v ?? "").replace(/[^\d+-]/g, ""));
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function impliedProb(odds) {
  return odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
}

function teamIdFromRef(ref) {
  const m = /\/teams\/(\d+)/.exec(ref ?? "");
  return m ? m[1] : null;
}

async function currentSeasons(path) {
  const board = await cachedFetchJson(
    `espn:season:${path.replace(/\//g, "_")}:v1`,
    6 * 60 * 60,
    `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`,
    5000,
  );
  const season = board?.season ?? board?.leagues?.[0]?.season;
  const year = Number(season?.year);
  if (!Number.isFinite(year)) return [];
  const type = Number(season?.type?.id ?? season?.type);
  // Types: 1 preseason, 2 regular, 3 postseason, 4 offseason.
  return type === 3 || type === 4 ? [year + 1, year] : [year];
}

async function findMarket(def, path, seasons) {
  const [sport, league] = path.split("/");
  for (const year of seasons) {
    const list = await cachedFetchJson(
      `espn:futures:${def.league}:${year}:v1`,
      6 * 60 * 60,
      `${CORE}/${sport}/leagues/${league}/seasons/${year}/futures?limit=100`,
      6000,
    );
    const item = (list?.items ?? []).find((it) =>
      def.match.test((it.displayName ?? it.name ?? "").trim()),
    );
    const books = item?.futures?.[0]?.books ?? [];
    if (books.length >= MIN_FIELD) {
      return { books, provider: item.futures[0].provider?.name ?? "DraftKings" };
    }
  }
  return null;
}

async function buildMarket(def) {
  const path = ESPN_PATH[def.league];
  if (!path) return null;
  const seasons = await currentSeasons(path);
  if (!seasons.length) return null;
  const [found, teams] = await Promise.all([
    findMarket(def, path, seasons),
    getLeagueTeams(def.league).catch(() => null),
  ]);
  if (!found || !teams?.byId) return null;

  const rows = [];
  for (const b of found.books) {
    const price = parseAmerican(b.value);
    const team = teams.byId.get(teamIdFromRef(b.team?.$ref));
    if (price == null || !team) continue;
    rows.push({ team, price, implied: impliedProb(price) });
  }
  if (rows.length < MIN_FIELD) return null;
  const fieldSum = rows.reduce((s, r) => s + r.implied, 0) || 1;

  const outcomes = rows
    .map((r) => ({
      name: r.team.fullName,
      displayName: r.team.nick ?? r.team.fullName,
      abbr: r.team.abbr,
      logo: r.team.logo,
      price: r.price,
      book: found.provider,
      fairPct: Math.round((r.implied / fieldSum) * 1000) / 10,
      books: 1,
    }))
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

export async function getEspnFutures() {
  const settled = await Promise.allSettled(CHAMPION_MARKETS.map(buildMarket));
  return settled
    .filter((r) => r.status === "fulfilled" && r.value)
    .map((r) => r.value);
}
