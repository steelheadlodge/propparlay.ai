// Specific team logos that get a thin white outline so they read on the dark
// background. Keyed by `${LEAGUE}:${ABBR}` (ESPN uppercase abbreviations).
// Everything else is left untouched.
const OUTLINE_LOGOS = new Set<string>([
  "MLB:NYY", // Yankees
  "MLB:SD", // Padres
  "MLB:TB", // Rays
  "MLB:KC", // Royals
  "MLB:COL", // Rockies
  "NFL:LAR", // Rams
]);

export function needsLogoOutline(
  league: string,
  abbr: string | null | undefined,
): boolean {
  if (!abbr) return false;
  return OUTLINE_LOGOS.has(`${league.toUpperCase()}:${abbr.toUpperCase()}`);
}
