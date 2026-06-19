import type { PropPick } from "../types/prop";
import { mockProps } from "./mockProps";

const nhlAndMore: PropPick[] = [
  {
    id: "5",
    player: "Connor McDavid",
    team: "EDM",
    opponent: "CGY",
    sport: "NHL",
    market: "Goals",
    gameTime: "Tonight · 8:00 PM ET",
    aiProjection: 0.82,
    unit: "goals",
    confidence: 79,
    edge: 5.8,
    recommendation: "over",
    books: [
      { book: "DraftKings", line: "O 0.5", odds: -135 },
      { book: "FanDuel", line: "O 0.5", odds: -128 },
    ],
    summary: "McDavid has scored in 6 of his last 8 vs Calgary.",
  },
  {
    id: "6",
    player: "David Pastrnak",
    team: "BOS",
    opponent: "TOR",
    sport: "NHL",
    market: "Shots on Goal",
    gameTime: "Tonight · 7:00 PM ET",
    aiProjection: 5.2,
    unit: "SOG",
    confidence: 70,
    edge: 3.9,
    recommendation: "over",
    books: [
      { book: "BetMGM", line: "O 4.5", odds: -115 },
      { book: "DraftKings", line: "O 4.5", odds: -112 },
    ],
    summary: "Toronto allows the 3rd-most SOG to opposing wingers this month.",
  },
  {
    id: "7",
    player: "James Cook",
    team: "BUF",
    opponent: "MIA",
    sport: "NFL",
    market: "Anytime TD",
    gameTime: "Sun · 4:25 PM ET",
    aiProjection: 0.58,
    unit: "TD",
    confidence: 76,
    edge: 7.1,
    recommendation: "over",
    books: [
      { book: "DraftKings", line: "Anytime TD", odds: -105 },
      { book: "FanDuel", line: "Anytime TD", odds: +100 },
    ],
    summary: "Cook has 4 TDs in 3 games vs Miami's run defense.",
  },
];

export const allMockProps: PropPick[] = [...mockProps, ...nhlAndMore];
