// Teams whose logos are predominantly black/dark and disappear against the dark
// card background. We can't detect this at runtime (ESPN images are
// cross-origin, so their pixels can't be read), so this is a curated list keyed
// by `${LEAGUE}:${ABBR}` using ESPN's uppercase abbreviations.
const DARK_LOGOS = new Set<string>([
  // NHL — black-dominant crests
  "NHL:BOS", // Bruins
  "NHL:LA", // Kings
  "NHL:PIT", // Penguins
  "NHL:VGK", // Golden Knights
  "NHL:ANA", // Ducks
  "NHL:CHI", // Blackhawks
  // NBA
  "NBA:BKN", // Nets
  "NBA:SA", // Spurs
  // NFL
  "NFL:LV", // Raiders
  "NFL:PIT", // Steelers
  "NFL:BAL", // Ravens
  "NFL:NO", // Saints
  "NFL:CIN", // Bengals
  // MLB
  "MLB:CHW", // White Sox
  "MLB:SF", // Giants
  "MLB:PIT", // Pirates
  "MLB:COL", // Rockies
]);

export function isDarkLogo(
  league: string,
  abbr: string | null | undefined,
): boolean {
  if (!abbr) return false;
  return DARK_LOGOS.has(`${league.toUpperCase()}:${abbr.toUpperCase()}`);
}
