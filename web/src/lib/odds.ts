import type { BookLine, PropPick } from "../types/prop";

export function americanToDecimal(odds: number): number {
  if (odds === 0) return 1;
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

export function decimalToAmerican(decimal: number): number {
  if (decimal <= 1) return 0;
  return decimal >= 2
    ? Math.round((decimal - 1) * 100)
    : Math.round(-100 / (decimal - 1));
}

export function formatAmerican(odds: number): string {
  return odds > 0 ? `+${odds}` : String(odds);
}

/** Total returned (stake included) for a single price at a given stake. */
export function payoutFor(american: number, stake = 10): number {
  return Math.round(stake * americanToDecimal(american));
}

/** Best (highest payout) book line for a prop. */
export function bestBook(prop: PropPick): BookLine {
  return prop.books.reduce((best, b) => (b.odds > best.odds ? b : best));
}

/** Combined decimal odds for a set of legs (independent legs assumed). */
export function parlayDecimal(legs: PropPick[]): number {
  return legs.reduce(
    (acc, leg) => acc * americanToDecimal(bestBook(leg).odds),
    1,
  );
}

/** Combined American odds for a parlay. */
export function parlayAmerican(legs: PropPick[]): number {
  if (legs.length === 0) return 0;
  return decimalToAmerican(parlayDecimal(legs));
}

/** Payout (total returned, stake included) for a given stake. */
export function parlayPayout(legs: PropPick[], stake: number): number {
  if (legs.length === 0) return 0;
  return stake * parlayDecimal(legs);
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
