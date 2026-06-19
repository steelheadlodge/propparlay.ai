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
};
