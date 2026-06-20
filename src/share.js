// Shared-parlay decoding + odds math for the worker side (OG unfurl + SVG card).
// Wire format mirrors web/src/lib/shareParlay.ts:
//   base64url(JSON([[league, marketKey, marketTitle, name, price, abbr], ...]))

const ESPN_LEAGUE = { NBA: "nba", NHL: "nhl", NFL: "nfl", MLB: "mlb" };

function b64urlToString(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeParlay(p) {
  try {
    const arr = JSON.parse(b64urlToString(p));
    if (!Array.isArray(arr)) return null;
    const legs = [];
    for (const t of arr) {
      const league = String(t[0] || "");
      const marketKey = String(t[1] || "");
      const marketTitle = String(t[2] || "");
      const name = String(t[3] || "");
      const price = Number(t[4]);
      const abbr = String(t[5] || "");
      if (!name || !Number.isFinite(price)) continue;
      legs.push({ league, marketKey, marketTitle, name, price, abbr });
    }
    return legs.length ? legs : null;
  } catch {
    return null;
  }
}

export function americanToDecimal(o) {
  return o > 0 ? 1 + o / 100 : 1 + 100 / Math.abs(o);
}

export function decimalToAmerican(d) {
  if (d <= 1) return 0;
  return d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1));
}

export function combinedAmerican(legs) {
  const dec = legs.reduce((acc, l) => acc * americanToDecimal(l.price), 1);
  return { american: decimalToAmerican(dec), decimal: dec };
}

export function formatAmerican(o) {
  return o > 0 ? `+${o}` : String(o);
}

export function logoUrl(league, abbr) {
  const lg = ESPN_LEAGUE[league];
  if (!lg || !abbr) return null;
  return `https://a.espncdn.com/i/teamlogos/${lg}/500/${abbr.toLowerCase()}.png`;
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
