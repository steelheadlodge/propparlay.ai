export type ZoneLevel = "pick" | "lean" | "neutral" | "fade" | "avoid";

export type HotZoneCell = {
  zone: ZoneLevel;
  shortLabel: string;
  player: string;
  market: string;
  edge?: number;
  propId?: string;
};

export type HotZoneRow = {
  market: string;
  nba: HotZoneCell | null;
  nhl: HotZoneCell | null;
  nfl: HotZoneCell | null;
  mlb: HotZoneCell | null;
};

export const SPORTS = ["NBA", "NHL", "NFL", "MLB"] as const;
export type SportKey = Lowercase<typeof SPORTS[number]>;

export const ZONE_META: Record<
  ZoneLevel,
  { label: string; description: string }
> = {
  pick: { label: "Our pick", description: "High edge — we're on it" },
  lean: { label: "Lean", description: "Near green — playable with caution" },
  neutral: { label: "Neutral", description: "No strong signal tonight" },
  fade: { label: "Fade", description: "Slight lean against" },
  avoid: { label: "No way", description: "Stay away — model says pass" },
};
