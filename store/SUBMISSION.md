# PropParlay — App Store / Play submission kit

Everything needed to submit the iOS app (and Android later). The native app is
built with Capacitor and **builds + runs successfully** on the simulator.

## App identity

| Field | Value |
|-------|-------|
| App name | **PropParlay** |
| Subtitle (iOS, 30 char) | Cross-sport parlay lab |
| Bundle ID | `ai.propparlay.app` |
| Category | Sports (primary) |
| Age rating | **17+** (frequent/intense simulated gambling) |
| Privacy Policy URL | https://propparlay.ai/privacy |
| Support URL | https://propparlay.ai/support |
| Marketing URL | https://propparlay.ai |
| Support email | support@propparlay.ai |

## Screenshots (already generated, exact required sizes)

| Device | Folder | Size | Count |
|--------|--------|------|-------|
| iPhone 6.9" | `store/iphone-6.9/` | 1290 × 2796 | 4 |
| iPad 13" | `store/ipad-13/` | 2064 × 2752 | 3 |

These are the only two screenshot sizes App Store Connect requires in 2026
(6.9" iPhone + 13" iPad cover all smaller devices). Unframed raw captures are in
`store/raw/` if you ever want plain device shots.

## Listing copy

**Promotional text (170 char)**
> Build cross-sport title parlays — World Series, Super Bowl, World Cup & more — at each team's real win chance. AI picks, heat-mapped odds, and live line shopping.

**Description**
> PropParlay is the parlay lab built around futures. Instead of grinding single
> games, stack long-term title bets across sports into one ticket and see each
> team's *real* win chance — with the sportsbook's margin stripped out.
>
> • Cross-sport parlay grid — pick a team down the side and one across the top; the cell where they meet shows combined odds, payout, and how likely it is to hit (greener = better).
> • AI parlay builder — choose a strategy (Safe, Balanced, Long shot, Value) and we assemble a cross-sport parlay from live market odds. Lock a team and let AI fill the rest.
> • Real win chances — de-vigged probabilities so the numbers aren't padded.
> • Tonight's slate — nightly player props, hot zones, and line shopping across NBA, NHL, NFL & MLB.
> • Share any parlay as a rich link.
>
> PropParlay is an information and entertainment tool. We are not a sportsbook,
> do not accept wagers, and do not process bets. Odds and projections come from
> public markets and are never a guarantee of any outcome. 18+ (21+ where
> required). If gambling is a problem, call 1-800-GAMBLER.

**Keywords (100 char)**
> parlay,odds,futures,sports betting,World Cup,Super Bowl,World Series,picks,props,NFL,NBA,MLB,NHL

**Reviewer notes (paste into App Review notes)**
> This app provides sports betting INFORMATION and analysis only. It does not
> accept wagers, process bets, hold funds, or facilitate gambling, and it does
> not link out to real-money sportsbooks. No account or login is required to use
> any feature. The app displays odds/probabilities from public data sources and
> includes responsible-gaming resources (1-800-GAMBLER) in-app and on the
> support page. Age rating set to 17+.

## App privacy ("nutrition label") answers

- **Email address** — collected only via optional waitlist/support. Linked to user. Used for App Functionality / Developer communications. **Not** used for tracking.
- **Usage / diagnostics** — standard, for analytics & app functionality. **Not** used for tracking.
- No third-party tracking, no ad SDKs, no IDFA.

## Build & upload — iOS

```bash
cd web
npm run cap:sync          # rebuild web bundle + sync into native projects
npm run ios               # opens Xcode
```
In Xcode:
1. Select the **App** target → **Signing & Capabilities** → set your **Team** (automatic signing).
2. Set **Version** (e.g. 1.0.0) and **Build** (1).
3. Choose **Any iOS Device (arm64)** as the destination.
4. **Product → Archive** → when done, **Distribute App → App Store Connect → Upload**.
5. In App Store Connect: attach screenshots from `store/iphone-6.9` and `store/ipad-13`, paste the copy above, set age rating 17+, add the privacy answers, and submit.

Notes:
- Export compliance is pre-answered (`ITSAppUsesNonExemptEncryption=false` in `Info.plist`), so uploads skip the encryption prompt.
- Capacitor 8 uses Swift Package Manager — no CocoaPods needed.

## Build & upload — Android (when ready)

```bash
cd web
npm run android           # opens Android Studio
```
Android Studio → **Build → Generate Signed App Bundle** (.aab) → upload to Play
Console. Play also requires a Privacy Policy URL (same one) and a real-money
gambling declaration = **no** (informational only).

## Important: the app talks to the live API

The native app loads its bundled web build and calls `https://propparlay.ai/api/*`.
That worker now sends `Access-Control-Allow-Origin: *` so the native web view
(origin `capacitor://localhost`) can read the API. If futures/props ever show
empty in the app, check that the worker is deployed and the API returns data.
