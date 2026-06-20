import { Capacitor } from "@capacitor/core";

// Public site origin — used for share links so they always point at the live
// site even from inside a native app (where the web view origin is localhost).
export const SITE_URL = "https://propparlay.ai";

// In native apps the web view loads from capacitor://localhost, so relative
// "/api/*" calls would hit the device, not the worker. Point them at the live
// origin. On the web build, stay relative so it works on any origin/preview.
export const isNative = Capacitor.isNativePlatform();
export const API_BASE = isNative ? SITE_URL : "";

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

// Router base differs by target: the web build is served under /app, the native
// bundle is served from the root of the web view.
export const ROUTER_BASENAME = isNative ? "/" : "/app";
