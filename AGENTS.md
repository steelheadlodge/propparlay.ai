# PropParlay — agent memory

Sports betting props & parlay companion. **Pre-launch** (waitlist live at propparlay.ai).
Tracked in Dev HQ (`/Users/ai/Documents/GitHub/dev-hq`).

## Architecture

Monorepo. Vite + React 19 + TypeScript web app (in `web/`) wrapped by **Capacitor 8** for
iOS/Android. A **Cloudflare Worker** (`src/worker.js`, name `propparlayai`) serves the
marketing landing page (`public/`) plus the built React app under `/app/*`, proxies the data
APIs (caching via the Cache API), and stores waitlist signups in **Workers KV** (`WAITLIST`
binding). **Formspree** (form `xjgdnazp`) is the email pipe. App OTA updates ship via **Capgo**.

- App ID (iOS/Android): `ai.propparlay.app`
- Worker: `propparlayai`, KV: `WAITLIST` (`441284619df84269a3fa5d513c4f0e6f`)
- Data sources: The Odds API (`ODDS_API_KEY` secret), ESPN scoreboard (free, no key)
- Capgo channel: `production`, `autoUpdate: always`, `directUpdate: always`

## How to ship a change

**Web + landing (most changes):**
1. Edit code in `/Users/ai/propparlay` — `web/` for the app, `src/worker.js` for the edge.
2. Push to `main`. Cloudflare auto-builds (`npm run build:web`) and runs `wrangler deploy`.
3. Live at propparlay.ai; React app serves under `/app/*`.

**Native app OTA (Capgo):**
1. `cd web && npm run build:native` to produce the `dist` bundle.
2. Upload the bundle to Capgo (`production` channel) → OTA to installed apps. No store review.

**Native store build (first launch / native plugin changes only):**
1. `npm run cap:sync`, open Xcode / Android Studio.
2. Bump build number, archive, submit to App Store / Play.

## Stack
React 19, React Router, Vite, TypeScript, CSS Modules · Capacitor 8 (ios/android) · Capgo (OTA)
· Cloudflare Workers + KV + Cache API · The Odds API · ESPN scoreboard · Formspree.

## Notes / where we left off
- Capgo set up: app created, API key wired, first bundle uploaded.
- Walked through App Store submission + build-number management (build 1.0 (2)).
- Partner: **Vince Roth**, 50/50 split. All PropParlay running costs are shared; bills are on
  your card and Vince reimburses his half. Tracked in Dev HQ's Partner tab.
- Dev HQ **Open project chat** opens this repo folder (same chat thread per workspace). Resume
  rule in `.cursor/rules/resume-context.mdc` tells the agent to read this file + git state at
  session start.
- Landing hero leads with live cross-sport futures heat-map grid; App Store screenshots updated.
- Uncommitted Capgo/native config changes in `web/` may still need committing.
