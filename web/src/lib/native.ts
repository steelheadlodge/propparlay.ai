import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

// Native-only setup: light status-bar text on the dark theme, then dismiss the
// launch splash once the web view is ready. No-ops on the web build.
export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

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
