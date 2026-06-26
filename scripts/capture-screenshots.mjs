#!/usr/bin/env node
/**
 * App Store screenshots — live app, each shot scrolled to a unique anchor.
 */
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), "../web/package.json"));
const { chromium } = require("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.SCREENSHOT_BASE ?? "https://propparlay.ai/app";
const HEADER_OFFSET = 88;

/** @type {{ dir: string, viewport: { width: number, height: number }, deviceScaleFactor: number, shots: { file: string, route: string, wait: { role: string, name: string, level?: number }, scroll?: { role: string, name: string, level?: number } }[] }[]} */
const SETS = [
  {
    dir: path.join(ROOT, "store/iphone-6.9"),
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    shots: [
      {
        file: "01-grid.png",
        route: "/grid",
        wait: { role: "heading", level: 1, name: "Cross-sport parlay grid" },
        scroll: { type: "text", value: "Down ↓" },
      },
      {
        file: "02-futures.png",
        route: "/",
        wait: { role: "heading", level: 1, name: "The futures of parlays" },
        scroll: { type: "role", role: "heading", level: 3, name: "Super Bowl Winner" },
      },
      {
        file: "03-ai-builder.png",
        route: "/",
        wait: { role: "heading", level: 1, name: "The futures of parlays" },
        scroll: { type: "role", role: "heading", level: 2, name: "AI parlay builder" },
      },
      {
        file: "04-tonight.png",
        route: "/tonight",
        wait: { role: "heading", level: 1, name: "Tonight's slate" },
        scroll: { type: "role", role: "heading", level: 2, name: "Hot zones" },
      },
    ],
  },
  {
    dir: path.join(ROOT, "store/ipad-13"),
    viewport: { width: 1032, height: 1376 },
    deviceScaleFactor: 2,
    shots: [
      {
        file: "01-grid.png",
        route: "/grid",
        wait: { role: "heading", level: 1, name: "Cross-sport parlay grid" },
        scroll: { type: "text", value: "Down ↓" },
      },
      {
        file: "02-futures.png",
        route: "/",
        wait: { role: "heading", level: 1, name: "The futures of parlays" },
        scroll: { type: "role", role: "heading", level: 3, name: "Super Bowl Winner" },
      },
      {
        file: "03-tonight.png",
        route: "/tonight",
        wait: { role: "heading", level: 1, name: "Tonight's slate" },
        scroll: { type: "role", role: "heading", level: 2, name: "Hot zones" },
      },
    ],
  },
];

const LEGACY = ["01.png", "02.png", "03.png", "04.png"];

function locator(page, { role, name, level }) {
  return page.getByRole(role, { name, ...(level ? { level } : {}) });
}

/** @typedef {{ type: 'role', role: string, name: string, level?: number } | { type: 'text', value: string }} ScrollTarget */

function scrollLocator(page, target) {
  if (target.type === "text") return page.getByText(target.value, { exact: true });
  return page.getByRole(target.role, { name: target.name, ...(target.level ? { level: target.level } : {}) });
}

async function scrollTo(page, target) {
  const el = scrollLocator(page, target);
  await el.waitFor({ timeout: 60000 });
  await el.evaluate((node) => node.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.evaluate((offset) => window.scrollBy(0, -offset), HEADER_OFFSET);
  await page.waitForTimeout(500);
}

async function capture(page, shot) {
  await page.goto(`${BASE}${shot.route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await locator(page, shot.wait).waitFor({ timeout: 60000 });
  if (shot.scroll) {
    await scrollTo(page, shot.scroll);
  } else {
    await page.waitForTimeout(400);
  }
}

async function hashFile(filePath) {
  const buf = await readFile(filePath);
  return createHash("md5").update(buf).digest("hex");
}

async function main() {
  const browser = await chromium.launch();
  try {
    for (const set of SETS) {
      await mkdir(set.dir, { recursive: true });
      for (const legacy of LEGACY) {
        try {
          await unlink(path.join(set.dir, legacy));
        } catch {
          /* gone */
        }
      }

      console.log(`→ ${path.basename(set.dir)}…`);
      const ctx = await browser.newContext({
        viewport: set.viewport,
        deviceScaleFactor: set.deviceScaleFactor,
        colorScheme: "dark",
      });
      const page = await ctx.newPage();
      const hashes = new Map();

      for (const shot of set.shots) {
        await capture(page, shot);
        const out = path.join(set.dir, shot.file);
        await page.screenshot({ path: out, fullPage: false });
        const md5 = await hashFile(out);
        if (hashes.has(md5)) {
          throw new Error(
            `${shot.file} is identical to ${hashes.get(md5)} — scroll anchor failed`,
          );
        }
        hashes.set(md5, shot.file);
        console.log(`  ✓ ${shot.file}`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log("\nDone — all shots unique.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
