// Title "heat" tiers for a futures outcome, by de-vigged fair probability.
// Mirrors the hot-zone idea: strong favorites run hot (green), longshots cold.
export type HeatTier = "fav" | "contender" | "live" | "long";

export function heatTier(fairPct: number): HeatTier {
  if (fairPct >= 18) return "fav";
  if (fairPct >= 9) return "contender";
  if (fairPct >= 4) return "live";
  return "long";
}

export const HEAT_META: Record<HeatTier, { label: string; color: string }> = {
  fav: { label: "Favorite", color: "#34d399" },
  contender: { label: "Contender", color: "#fbbf24" },
  live: { label: "Live longshot", color: "#38bdf8" },
  long: { label: "Longshot", color: "#94a3b8" },
};
