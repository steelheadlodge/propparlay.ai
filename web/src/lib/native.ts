import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { CapacitorUpdater } from "@capgo/capacitor-updater";

// Native-only setup: light status-bar text on the dark theme, then dismiss the
// launch splash once the web view is ready. No-ops on the web build.
export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Tell Capgo this bundle booted successfully so it won't auto-roll-back to
  // the previous version. Must run on every launch once the app is interactive.
  try {
    await CapacitorUpdater.notifyAppReady();
  } catch {
    /* updater plugin unavailable — ignore */
  }

  try {
    await StatusBar.setStyle({ style: Style.Dark }); // light glyphs for dark bg
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#0b0b0f" });
    }
  } catch {
    /* status bar plugin unavailable — ignore */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* splash plugin unavailable — ignore */
  }
}
