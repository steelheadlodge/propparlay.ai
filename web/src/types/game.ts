export type GameSide = {
  abbr: string;
  name: string;
  logo: string | null;
  score: number | null;
  winner: boolean;
};

export type GameStatus = "scheduled" | "live" | "final" | "other";

export type LiveGame = {
  id: string;
  league: string;
  home: GameSide;
  away: GameSide;
  startMs: number | null;
  time: string;
  status: GameStatus;
  clock: string | null;
};

export type GamesResponse = {
  games: LiveGame[];
  dateLabel: string;
  isTomorrow: boolean;
};
