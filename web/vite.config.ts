import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// CAP_BUILD=1 builds the bundle that ships inside the native (Capacitor) apps:
// relative asset paths + root base, output to ./dist (Capacitor's webDir).
// The default build is the web app served by the worker under /app.
const isNative = process.env.CAP_BUILD === "1";

export default defineConfig({
  plugins: [react()],
  base: isNative ? "./" : "/app/",
  build: {
    outDir: isNative ? "dist" : "../public/app",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
