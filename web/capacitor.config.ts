import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ai.propparlay.app",
  appName: "PropParlay",
  webDir: "dist",
  backgroundColor: "#0b0b0f",
  ios: {
    contentInset: "always",
    backgroundColor: "#0b0b0f",
  },
  android: {
    backgroundColor: "#0b0b0f",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#0b0b0f",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
