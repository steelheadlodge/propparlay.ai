export type BookLine = {
  book: string;
  line: string;
  odds: number;
};

export type PropPick = {
  id: string;
  player: string;
  team: string;
  opponent: string;
  sport: string;
  market: string;
  gameTime: string;
  aiProjection: number;
  unit: string;
  confidence: number;
  edge: number;
  recommendation: "over" | "under";
  books: BookLine[];
  summary: string;
  // Optional live-data extras (present on cards built from The Odds API).
  teamLogo?: string | null;
  headshot?: string | null;
  projectionLabel?: string;
  zone?: string;
};
