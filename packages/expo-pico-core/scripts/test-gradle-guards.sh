#!/usr/bin/env bash
# Runs android/pico-window-positions.gradle and android/one-launcher-tile.gradle
# against real merged manifests: an AGP app module in
# __tests__/gradle-fixture, once per manifest in its manifests/ directory.
# Needs Java 17 and an Android SDK (ANDROID_HOME).
set -uo pipefail
PKG="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="$PKG/__tests__/gradle-fixture"
GRADLE="$PKG/android/gradlew"
fail=0

# expect <manifest> <0|1> [message the failure must contain]
expect() {
  local manifest="$1" want="$2" message="${3:-}"
  local log
  log="$("$GRADLE" -q -p "$FIXTURE" --no-daemon \
    -Pmanifest="$FIXTURE/manifests/$manifest.xml" \
    checkDebugPicoWindowPositions checkDebugOneLauncherTile 2>&1)"
  local got=$?
  [ "$got" -ne 0 ] && got=1
  if [ "$got" -ne "$want" ]; then
    echo "FAIL $manifest: exit $got, expected $want"; echo "$log" | tail -20; fail=1; return
  fi
  if [ -n "$message" ] && ! grep -qF -- "$message" <<<"$log"; then
    echo "FAIL $manifest: output lacks: $message"; echo "$log" | tail -20; fail=1; return
  fi
  echo "ok   $manifest (exit $got)"
}

expect ok 0
expect shared-position 1 'sets pico.vr.position="rail", the same window as expo.modules.pico.PicoPanelActivity'
expect implicit-far 1 'an activity without the key counts as "far"'
expect near 1 'which PICO OS shows as a popup'
expect two-tiles 1 '[one-launcher-tile]'
exit $fail
