// Shared ESPN helpers: team logo + roster headshot resolvers (free, cached).
// Used by both the live props slate and the futures board.

export const ESPN_PATH = {
  NBA: "basketball/nba",
  WNBA: "basketball/wnba",
  NHL: "hockey/nhl",
  NFL: "football/nfl",
  MLB: "baseball/mlb",
  NCAAF: "football/college-football",
  NCAAB: "basketball/mens-college-basketball",
  // Soccer competitions use ESPN's league slugs under /sports/soccer/<slug>.
  "Int'l Soccer": "soccer/fifa.world",
  UCL: "soccer/uefa.champions",
  Europa: "soccer/uefa.europa",
  Conference: "soccer/uefa.europa.conf",
  Euros: "soccer/uefa.euro",
  EPL: "soccer/eng.1",
  Championship: "soccer/eng.2",
  "La Liga": "soccer/esp.1",
  "Serie A": "soccer/ita.1",
  Bundesliga: "soccer/ger.1",
  "Ligue 1": "soccer/fra.1",
  MLS: "soccer/usa.1",
  "Liga MX": "soccer/mex.1",
  Eredivisie: "soccer/ned.1",
  "Primeira Liga": "soccer/por.1",
  "Brazil Série A": "soccer/bra.1",
  "Saudi Pro League": "soccer/ksa.1",
  "Scottish Prem": "soccer/sco.1",
  Libertadores: "soccer/conmebol.libertadores",
};

export function normName(s) {
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
export async function cachedFetchJson(cacheKey, ttlSeconds, url, ms) {
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
export async function getLeagueTeams(league) {
  const path = ESPN_PATH[league];
  if (!path) return null;
  const json = await cachedFetchJson(
    `espn:teams:${league.replace(/\s+/g, "_")}:v1`,
    24 * 60 * 60,
    `https://site.api.espn.com/apis/site/v2/sports/${path}/teams?limit=300`,
    5000,
  );
  const teams = json?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  const byName = new Map();
  const abbrLogo = new Map();
  for (const t of teams) {
    const team = t.team ?? {};
    const abbr = (team.abbreviation ?? "").toUpperCase();
    const logo = team.logos?.[0]?.href ?? null;
    // ESPN "name" is the nickname (e.g. "Dodgers"); fall back to short label.
    const nick = team.name ?? team.shortDisplayName ?? team.nickname ?? null;
    if (!abbr) continue;
    abbrLogo.set(abbr, logo);
    // Index by every name variant so we can match a variety of feed labels
    // (e.g. "Kansas City Chiefs", "Chiefs", "KC").
    for (const n of [team.displayName, team.shortDisplayName, team.name, team.nickname, team.location, abbr]) {
      if (n) byName.set(normName(n), { abbr, logo, nick });
    }
  }
  return { byName, abbrLogo };
}

// teamAbbr -> Map(normName -> headshotUrl)
export async function getRosterHeadshots(league, abbr) {
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
