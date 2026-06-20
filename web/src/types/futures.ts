export type FuturesOutcome = {
  name: string;
  abbr: string | null;
  logo: string | null;
  price: number;
  book: string;
  fairPct: number;
  books: number;
};

export type FuturesMarket = {
  key: string;
  league: string;
  title: string;
  description: string;
  outcomes: FuturesOutcome[];
};

export type FuturesQuota = { remaining: number | null; used: number | null };

export type FuturesResponse = {
  configured: boolean;
  markets: FuturesMarket[];
  quota?: FuturesQuota | null;
  error?: string;
};
