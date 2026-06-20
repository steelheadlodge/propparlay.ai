export type SportTheme = {
  color: string;
  glow: string;
  label: string;
};

export const SPORT_THEME: Record<string, SportTheme> = {
  NBA: { color: "#f97316", glow: "rgba(249, 115, 22, 0.35)", label: "NBA" },
  NHL: { color: "#38bdf8", glow: "rgba(56, 189, 248, 0.35)", label: "NHL" },
  NFL: { color: "#f59e0b", glow: "rgba(245, 158, 11, 0.35)", label: "NFL" },
  MLB: { color: "#ef4444", glow: "rgba(239, 68, 68, 0.35)", label: "MLB" },
  NCAAF: { color: "#eab308", glow: "rgba(234, 179, 8, 0.35)", label: "NCAAF" },
  NCAAB: { color: "#f97316", glow: "rgba(249, 115, 22, 0.35)", label: "NCAAB" },
  "World Cup": { color: "#22c55e", glow: "rgba(34, 197, 94, 0.35)", label: "World Cup" },
  UCL: { color: "#818cf8", glow: "rgba(129, 140, 248, 0.35)", label: "UCL" },
  Europa: { color: "#fb923c", glow: "rgba(251, 146, 60, 0.35)", label: "Europa" },
  Euros: { color: "#2dd4bf", glow: "rgba(45, 212, 191, 0.35)", label: "Euros" },
  EPL: { color: "#a855f7", glow: "rgba(168, 85, 247, 0.35)", label: "EPL" },
  "La Liga": { color: "#ef4444", glow: "rgba(239, 68, 68, 0.35)", label: "La Liga" },
  "Serie A": { color: "#3b82f6", glow: "rgba(59, 130, 246, 0.35)", label: "Serie A" },
  Bundesliga: { color: "#f43f5e", glow: "rgba(244, 63, 94, 0.35)", label: "Bundesliga" },
  "Ligue 1": { color: "#14b8a6", glow: "rgba(20, 184, 166, 0.35)", label: "Ligue 1" },
  MLS: { color: "#10b981", glow: "rgba(16, 185, 129, 0.35)", label: "MLS" },
};

const SOCCER_LEAGUES = new Set([
  "World Cup",
  "UCL",
  "Europa",
  "Euros",
  "EPL",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "MLS",
]);

export function isSoccer(sport: string): boolean {
  return SOCCER_LEAGUES.has(sport);
}

export function sportTheme(sport: string): SportTheme {
  return (
    SPORT_THEME[sport] ?? {
      color: "#6366f1",
      glow: "rgba(99, 102, 241, 0.35)",
      label: sport,
    }
  );
}

// Team primary colors for the teams used in mock data; falls back to a
// deterministic hue so any team still gets a stable, distinct color.
const TEAM_COLORS: Record<string, string> = {
  MIN: "#236192",
  DEN: "#fec524",
  MIA: "#008e97",
  BUF: "#00338d",
  LAD: "#005a9c",
  SD: "#2f241d",
  EDM: "#ff4c00",
  CGY: "#c8102e",
  BOS: "#fcb514",
  TOR: "#00205b",
};

// Maps our sport label to ESPN's league path used in their public CDN.
const ESPN_LEAGUE: Record<string, string> = {
  NBA: "nba",
  NHL: "nhl",
  NFL: "nfl",
  MLB: "mlb",
};

/**
 * ESPN's free team-logo CDN, keyed by lowercase team abbreviation.
 * e.g. https://a.espncdn.com/i/teamlogos/nba/500/min.png
 */
export function espnLogoUrl(sport: string, team: string): string | null {
  const league = ESPN_LEAGUE[sport];
  if (!league) return null;
  return `https://a.espncdn.com/i/teamlogos/${league}/500/${team.toLowerCase()}.png`;
}

export function teamColor(team: string): string {
  if (TEAM_COLORS[team]) return TEAM_COLORS[team];
  let hash = 0;
  for (let i = 0; i < team.length; i++) {
    hash = team.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export type ConfidenceTier = "high" | "mid" | "low";

export function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 78) return "high";
  if (confidence >= 70) return "mid";
  return "low";
}

export const CONFIDENCE_COLOR: Record<ConfidenceTier, string> = {
  high: "#34d399",
  mid: "#a5b4fc",
  low: "#fbbf24",
};
