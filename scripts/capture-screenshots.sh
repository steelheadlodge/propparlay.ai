#!/usr/bin/env bash
# Capture App Store screenshots from the iOS Simulator (no World Cup — live API).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/web"
DERIVED="$ROOT/build/sim"
BUNDLE_ID="ai.propparlay.app"
IPHONE_UDID="3162E2F9-8E3C-4A85-9A57-0679B2D88602"
IPAD_UDID="9BF80B7F-6D4B-46DE-891B-FCF0108650A9"

mkdir -p "$ROOT/store/iphone-6.9" "$ROOT/store/ipad-13" "$ROOT/store/raw"

echo "→ cap sync + simulator build…"
cd "$WEB"
npm run cap:sync >/dev/null
xcodebuild build \
  -project "$WEB/ios/App/App.xcodeproj" \
  -scheme App \
  -configuration Debug \
  -destination "generic/platform=iOS Simulator" \
  -derivedDataPath "$DERIVED" \
  DEVELOPMENT_TEAM=H8R3K9P5AC \
  CODE_SIGN_STYLE=Automatic \
  -quiet

APP="$(find "$DERIVED" -name 'PropParlay.app' -path '*iphonesimulator*' | head -1)"
if [[ -z "$APP" ]]; then
  echo "PropParlay.app not found in $DERIVED" >&2
  exit 1
fi

shot() {
  local udid=$1 out=$2 url=$3
  xcrun simctl terminate "$udid" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl launch "$udid" "$BUNDLE_ID" >/dev/null
  sleep 2
  xcrun simctl openurl "$udid" "$url" 2>/dev/null || true
  sleep 5
  xcrun simctl io "$udid" screenshot "$out"
  # Normalize to App Store required sizes when sim pixel size differs slightly.
  if [[ "$out" == *iphone-6.9* ]]; then
    sips -z 2796 1290 "$out" >/dev/null
  elif [[ "$out" == *ipad-13* ]]; then
    sips -z 2752 2064 "$out" >/dev/null
  fi
  echo "  ✓ $(basename "$out")"
}

capture_phone() {
  local udid=$1 dir=$2
  echo "→ iPhone screenshots…"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  xcrun simctl install "$udid" "$APP"
  shot "$udid" "$dir/01-grid.png" "capacitor://localhost/grid"
  shot "$udid" "$dir/02-futures.png" "capacitor://localhost/"
  shot "$udid" "$dir/03-ai-builder.png" "capacitor://localhost/?shot=ai"
  shot "$udid" "$dir/04-tonight.png" "capacitor://localhost/tonight"
}

capture_ipad() {
  local udid=$1 dir=$2
  echo "→ iPad screenshots…"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  xcrun simctl install "$udid" "$APP"
  shot "$udid" "$dir/01-grid.png" "capacitor://localhost/grid"
  shot "$udid" "$dir/02-futures.png" "capacitor://localhost/"
  shot "$udid" "$dir/03-tonight.png" "capacitor://localhost/tonight"
}

capture_phone "$IPHONE_UDID" "$ROOT/store/iphone-6.9"
capture_ipad "$IPAD_UDID" "$ROOT/store/ipad-13"

cp "$ROOT/store/iphone-6.9/"*.png "$ROOT/store/raw/" 2>/dev/null || true
cp "$ROOT/store/ipad-13/"*.png "$ROOT/store/raw/" 2>/dev/null || true

echo ""
echo "Done → $ROOT/store/iphone-6.9/ (4) and $ROOT/store/ipad-13/ (3)"
echo "Upload these in App Store Connect while build 3 processes."
