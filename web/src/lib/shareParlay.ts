import type { FuturesLeg } from "../context/FuturesParlayContext";
import { espnLogoUrl } from "./theme";

// Compact wire tuple: [league, marketKey, marketTitle, name, price, abbr].
type Tuple = [string, string, string, string, number, string];

function stringToB64url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToString(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeParlay(legs: FuturesLeg[]): string {
  const tuples: Tuple[] = legs.map((l) => [
    l.league,
    l.marketKey,
    l.marketTitle,
    l.name,
    l.price,
    l.abbr ?? "",
  ]);
  return stringToB64url(JSON.stringify(tuples));
}

export function decodeParlay(p: string): FuturesLeg[] | null {
  try {
    const arr = JSON.parse(b64urlToString(p));
    if (!Array.isArray(arr)) return null;
    const legs: FuturesLeg[] = [];
    for (const t of arr as Tuple[]) {
      const [league, marketKey, marketTitle, name, price, abbr] = t;
      if (!name || !Number.isFinite(Number(price))) continue;
      legs.push({
        id: `${marketKey}:${name}`,
        league,
        marketKey,
        marketTitle,
        name,
        abbr: abbr || null,
        logo: abbr ? espnLogoUrl(league, abbr) : null,
        price: Number(price),
        fairPct: 0,
      });
    }
    return legs.length ? legs : null;
  } catch {
    return null;
  }
}

// Canonical share link routed through the worker /s page (rich link unfurl),
// which redirects humans into the app with the parlay pre-loaded.
export function shareUrl(legs: FuturesLeg[]): string {
  const enc = encodeParlay(legs);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://propparlay.ai";
  return `${origin}/s?p=${enc}`;
}
