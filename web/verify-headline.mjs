import { chromium } from "playwright";
const browser = await chromium.launch();

// Desktop
const d = await browser.newPage({ viewport: { width: 1000, height: 700 } });
await d.goto("https://propparlay.ai/app", { waitUntil: "networkidle" });
await d.waitForTimeout(2800);
await d.screenshot({ path: "headline-desktop.png" });

// iPhone-ish
const m = await browser.newPage({ viewport: { width: 390, height: 740 } });
await m.goto("https://propparlay.ai/app", { waitUntil: "networkidle" });
await m.waitForTimeout(2800);
await m.screenshot({ path: "headline-mobile.png" });

await browser.close();
console.log("done");
