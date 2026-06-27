#!/bin/sh

# Xcode Cloud post-clone script.
#
# Capacitor's CapApp-SPM/Package.swift references local packages at
# ../../../node_modules/@capacitor/*. Xcode Cloud clones a clean repo with no
# node_modules and no built web bundle, so SPM cannot resolve those packages and
# the build fails before it starts. This installs the JS deps, builds the web
# bundle, and syncs the native project so Xcode has everything it needs.

set -e

# Derive paths from this script's own location instead of $CI_WORKSPACE /
# $CI_PRIMARY_REPOSITORY_PATH, whose meaning has shifted across Xcode Cloud
# versions. Script lives at web/ios/App/ci_scripts/, so web/ is three levels up.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
echo ">>> Web project dir: $WEB_DIR"

# Install Node if the runner doesn't already have it.
if ! command -v node >/dev/null 2>&1; then
  echo ">>> Installing Node via Homebrew..."
  export HOMEBREW_NO_AUTO_UPDATE=1
  export HOMEBREW_NO_INSTALL_CLEANUP=1
  brew install node
fi
echo ">>> Node $(node -v), npm $(npm -v)"

cd "$WEB_DIR"

# maxsockets workaround for flaky npm installs on Xcode Cloud runners.
npm config set maxsockets 3
echo ">>> Installing JS dependencies..."
npm ci

echo ">>> Building web bundle..."
npm run build:native

echo ">>> Syncing Capacitor iOS project..."
npx cap sync ios

echo ">>> Post-clone complete."
