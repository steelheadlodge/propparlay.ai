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
};

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
