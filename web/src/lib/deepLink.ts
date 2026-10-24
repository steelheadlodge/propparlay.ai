// Turn an incoming https://propparlay.ai link into an in-app route.
// The native router has no /app prefix and no /s page; shared parlays land on the grid.
export function pathFromIncomingUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "propparlay.ai") return null;

  let path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/app") path = "/grid";
  else if (path.startsWith("/app/")) path = path.slice(4);

  const qs = new URLSearchParams();
  const p = url.searchParams.get("p");
  const ref = url.searchParams.get("ref");
  if (p) qs.set("p", p);
  if (ref) qs.set("ref", ref);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  if (path === "/s" || path.startsWith("/s/")) return `/grid${suffix}`;
  if (path === "/grid" || path === "/futures" || path === "/tonight") {
    return `${path}${suffix}`;
  }
  if (p) return `/grid${suffix}`;
  return null;
}
