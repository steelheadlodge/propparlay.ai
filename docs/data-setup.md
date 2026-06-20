# Live data setup

PropParlay pulls live data through the Cloudflare Worker so that third-party
keys stay server-side and responses are edge-cached. There are two sources.

## 1. ESPN scoreboard — no key required

Live games (NBA / NHL / NFL / MLB) come from ESPN's public scoreboard API. No
key, no config. The Worker fetches all four leagues for today (ET), falls back
to tomorrow on an all-around off day, normalizes the payload, and edge-caches it
for 60 seconds.

- Endpoint exposed to the app: `GET /api/games`
- Upstream: `https://site.api.espn.com/apis/site/v2/sports/{sport}/scoreboard?dates=YYYYMMDD`
- Code: `src/espn.js`
- App consumes it via `web/src/hooks/useGames.ts` → `GamesBoard` ("Tonight's games").

Team logos come straight from the ESPN CDN URLs in the scoreboard response.

## 2. The Odds API — key required for live lines

Real betting lines (moneylines now; player props ready to enable) come from
[The Odds API](https://the-odds-api.com). The Worker only calls it when a key is
present; otherwise every odds endpoint returns `{ "configured": false }` and the
app shows the amber **Model preview** badge instead of green **Live odds**.

### Add the key

```bash
# from the repo root
npx wrangler secret put ODDS_API_KEY
# paste the key from the-odds-api.com dashboard when prompted
```

That's it — no `wrangler.jsonc` change needed (secrets are not stored there).
Redeploy (`git push`, or `npx wrangler deploy`) and the badge flips to **Live odds**.

### Endpoints exposed to the app

| Route                                              | Cost            | Notes                                             |
| -------------------------------------------------- | --------------- | ------------------------------------------------- |
| `GET /api/odds`                                    | 4 calls / fetch | Game-level moneylines for NBA/NHL/NFL/MLB, cached 120s |
| `GET /api/props?sport=baseball_mlb&eventId=<id>`   | 1 call / event  | Player props for one event, on demand, cached 120s |

- Code: `src/odds.js`
- Sport keys: `basketball_nba`, `icehockey_nhl`, `americanfootball_nfl`, `baseball_mlb`
- Player-prop markets per sport live in `PROP_MARKETS` (`src/odds.js`). Game odds
  are cheap; player props cost one credit per event, so the app requests them on
  demand rather than on every load to protect your monthly quota.

## Caching

All three routes use the Cloudflare Cache API (`caches.default`) via the
`cachedJson` helper in `src/worker.js`. Bump the version suffix in the cache key
(e.g. `games:v1` → `games:v2`) when you change a response shape.

## Local testing

```bash
npx wrangler dev --port 8787 --local   # serves /api/* against live upstreams
cd web && npm run dev                   # vite proxies /api → :8787
```

Then open http://localhost:5173/app/.
