// ESPN public scoreboard proxy — no API key required.
// Endpoint: https://site.api.espn.com/apis/site/v2/sports/{sport}/scoreboard?dates=YYYYMMDD
// Pattern mirrors the TunedTV integration (steelheadlodge/tuned-tv-finder).

const LEAGUES = [
  { tag: "NBA", path: "basketball/nba" },
  { tag: "NHL", path: "hockey/nhl" },
  { tag: "NFL", path: "football/nfl" },
  { tag: "MLB", path: "baseball/mlb" },
];

function etDateKey(ms) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get("year")}${get("month")}${get("day")}`;
}

function etLabel(ms) {
  return new Date(ms).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function etTime(ms) {
  if (!Number.isFinite(ms)) return "TBD";
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

function parseScore(s) {
  if (s == null) return null;
  const n = typeof s === "number" ? s : Number(s);
  return Number.isFinite(n) ? n : null;
}

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeEvent(ev, league) {
  const comp = ev.competitions?.[0];
  if (!comp) return null;
  const home = comp.competitors?.find((c) => c.homeAway === "home");
  const away = comp.competitors?.find((c) => c.homeAway === "away");
  if (!home?.team || !away?.team) return null;

  const state = (comp.status?.type?.state ?? "").toLowerCase();
  let status = "other";
  if (state === "pre") status = "scheduled";
  else if (state === "in") status = "live";
  else if (state === "post") status = "final";

  const startMs = ev.date ? new Date(ev.date).getTime() : NaN;
  const clock =
    status === "live"
      ? comp.status?.type?.shortDetail ?? "Live"
      : status === "final"
        ? comp.status?.type?.description ?? "Final"
        : null;

  const side = (c) => ({
    abbr: (c.team?.abbreviation ?? "").toUpperCase(),
    name: c.team?.shortDisplayName ?? c.team?.displayName ?? "",
    logo: c.team?.logo ?? null,
    score: parseScore(c.score),
    winner: status === "final" ? Boolean(c.winner) : false,
  });

  return {
    id: `${league}-${ev.id ?? `${away.team?.abbreviation}@${home.team?.abbreviation}`}`,
    league,
    home: side(home),
    away: side(away),
    startMs: Number.isFinite(startMs) ? startMs : null,
    time: Number.isFinite(startMs) ? etTime(startMs) : "TBD",
    status,
    clock,
  };
}

async function fetchLeagueDay(path, tag, yyyymmdd) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${yyyymmdd}`;
  const res = await fetchWithTimeout(url, 4500);
  if (!res.ok) {
    if (res.status >= 400 && res.status < 500) return [];
    throw new Error(`ESPN ${tag} ${yyyymmdd} HTTP ${res.status}`);
  }
  const json = await res.json();
  const out = [];
  for (const ev of json.events ?? []) {
    const g = normalizeEvent(ev, tag);
    if (g) out.push(g);
  }
  return out;
}

async function fetchDay(yyyymmdd) {
  const settled = await Promise.allSettled(
    LEAGUES.map((l) => fetchLeagueDay(l.path, l.tag, yyyymmdd)),
  );
  const games = [];
  let anySuccess = false;
  for (const r of settled) {
    if (r.status === "fulfilled") {
      anySuccess = true;
      games.push(...r.value);
    }
  }
  return { games, anySuccess };
}

function sortGames(games) {
  const rank = { live: 0, scheduled: 1, final: 2, other: 3 };
  return [...games].sort(
    (a, b) =>
      rank[a.status] - rank[b.status] || (a.startMs ?? 0) - (b.startMs ?? 0),
  );
}

// Returns { games, dateLabel, isTomorrow }. Falls back to tomorrow when today
// has no scheduled games (e.g. an off day across all four leagues).
export async function getGames() {
  const now = Date.now();
  const todayKey = etDateKey(now);
  const today = await fetchDay(todayKey);

  if (today.games.length === 0 && !today.anySuccess) {
    throw new Error("ESPN: all leagues failed");
  }

  if (today.games.length > 0) {
    return {
      games: sortGames(today.games),
      dateLabel: etLabel(now),
      isTomorrow: false,
    };
  }

  const tomorrowMs = now + 24 * 60 * 60 * 1000;
  const tomorrow = await fetchDay(etDateKey(tomorrowMs));
  return {
    games: sortGames(tomorrow.games),
    dateLabel: etLabel(tomorrowMs),
    isTomorrow: true,
  };
}
