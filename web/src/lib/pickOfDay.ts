import type { FuturesLeg } from "../context/FuturesParlayContext";
import { americanToDecimal, decimalToAmerican } from "./odds";
import type { FuturesMarket } from "../types/futures";

const US_LEAGUES = new Set(["NFL", "MLB", "NBA", "NHL", "NCAAF", "NCAAB", "WNBA"]);

export type PickOfDay = {
  legs: FuturesLeg[];
  american: number;
  names: string[];
  dateKey: string;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// Whole days since the Unix epoch — a stable per-day integer for rotation.
function dayNumber(): number {
  return Math.floor(Date.now() / 86_400_000);
}

function legFrom(m: FuturesMarket): FuturesLeg | null {
  const o = m.outcomes[0];
  if (!o) return null;
  return {
    id: `${m.key}:${o.name}`,
    league: m.league,
    marketKey: m.key,
    marketTitle: m.title,
    name: o.name,
    displayName: o.displayName,
    abbr: o.abbr,
    logo: o.logo,
    price: o.price,
    fairPct: o.fairPct,
  };
}

/**
 * A cross-sport "pick of the day" — one top favorite from two different
 * leagues. The pairing rotates each day (seeded by the date) so the banner
 * feels fresh even when futures odds barely move between days.
 */
export function buildPickOfDay(markets: FuturesMarket[]): PickOfDay | null {
  const byLeague = new Map<string, FuturesMarket>();
  for (const m of markets) {
    if (m.outcomes[0] && !byLeague.has(m.league)) byLeague.set(m.league, m);
  }
  const byPct = (a: FuturesMarket, b: FuturesMarket) =>
    (b.outcomes[0]?.fairPct ?? 0) - (a.outcomes[0]?.fairPct ?? 0);

  const all = [...byLeague.values()];
  const us = all.filter((m) => US_LEAGUES.has(m.league)).sort(byPct);
  const rest = all.filter((m) => !US_LEAGUES.has(m.league)).sort(byPct);

  // Rotate within the marquee US pool when we have enough leagues there;
  // otherwise rotate the full ordered pool. Rotation makes the pick change
  // daily while keeping each leg a true top favorite of its league.
  const pool = us.length >= 2 ? us : [...us, ...rest];
  if (pool.length < 2) return null;

  const offset = dayNumber() % pool.length;
  const rotated = pool.map((_, i) => pool[(i + offset) % pool.length]);

  const legs: FuturesLeg[] = [];
  for (const m of rotated) {
    const leg = legFrom(m);
    if (leg) legs.push(leg);
    if (legs.length >= 2) break;
  }
  if (legs.length < 2) return null;

  const decimal = legs.reduce((d, l) => d * americanToDecimal(l.price), 1);
  return {
    legs,
    american: decimalToAmerican(decimal),
    names: legs.map((l) => l.displayName ?? l.name),
    dateKey: todayKey(),
  };
}
