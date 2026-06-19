# PropParlay.ai

AI-powered prop betting & parlay intelligence. Live at **[propparlay.ai](https://propparlay.ai)**.

## What's here

| Path | What it is |
|------|------------|
| `public/index.html` | Marketing landing page + waitlist form |
| `public/app/` | Built React app (generated — do not edit by hand) |
| `web/` | React + Vite + TypeScript source for the app at `/app` |
| `src/worker.js` | Cloudflare Worker: waitlist API + static asset serving + SPA fallback |
| `wrangler.jsonc` | Worker config (KV binding, Formspree form id, assets) |

## Routes

- `/` — landing page + waitlist
- `/app` — React dashboard: hot-zones grid, prop picks, parlay builder
- `POST /api/waitlist` — saves email to KV; the landing page also notifies Formspree from the browser
- `GET /api/waitlist/count` — current signup count

## Local development

```bash
# App (React) with hot reload — proxies /api to a local worker on :8787
cd web && npm install && npm run dev

# Full stack (worker + built assets)
npm install
npm run dev:worker
```

The Vite dev server runs at `http://localhost:5173/app/`.

## Build & deploy

```bash
# Build the React app into public/app
npm run build

# Deploy the worker + assets to Cloudflare
npm run deploy   # requires CLOUDFLARE_API_TOKEN, or run `wrangler login` first
```

Pushing to `main` triggers Cloudflare's git build, which runs `wrangler deploy`.

> Important: after changing anything in `web/`, run `npm run build` so `public/app/`
> reflects your changes before committing.

## Waitlist

- Signups are stored in **Cloudflare KV** (namespace `propparlay-waitlist`, binding `WAITLIST`).
- The landing page POSTs to Formspree (`xjgdnazp`) **from the browser** so notifications
  reach the inbox reliably (server-side posts land in Formspree spam).
- See `docs/waitlist-setup.md` for setup details.

## Tech stack

- **Frontend app:** React 19, React Router, Vite, TypeScript, CSS Modules
- **Edge runtime:** Cloudflare Workers + Workers KV
- **Landing:** static HTML/CSS/JS (no build step)

## Roadmap

- [ ] Live odds API (replace mock data in `web/src/data/`)
- [ ] Account access gated by waitlist approval
- [ ] Correlation-aware parlay suggestions
- [ ] Historical results / model accuracy tracking
