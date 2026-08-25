#!/usr/bin/env bash
#
# Compile-check every Hybrid*.kt in the family without an Android SDK.
#
# This is how the Kotlin under packages/*/android/src/nitro was verified.
# It is not a substitute for `assemblePicoDebug` — it does not run
# nitrogen's C++ side, dex anything, or link JNI — but it does typecheck
# every implementation against the real nitrogen-generated specs and the
# real com.pico.pps classes pulled from the published AARs, which catches
# the mistakes that matter most: wrong signatures, wrong enum constants,
# missing constructor parameters, and Kotlin interfaces that do not
# SAM-convert.
#
# Usage:  bash kotlin-verify.sh /path/to/expo-pico
set -euo pipefail
REPO="${1:?usage: kotlin-verify.sh <repo-root>}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PKGS=(account achievements core iap leaderboards notifications rooms rtc social spatial storage subscription)

echo "==> resolving the PPS artifacts"
mkdir -p "$WORK/pps"
cat > "$WORK/pps/settings.gradle" <<'G'
rootProject.name = 'pps'
G
cat > "$WORK/pps/build.gradle" <<'G'
plugins { id 'java-library' }
repositories {
    maven { url "https://artifact.bytedance.com/repository/Volcengine/" }
    google(); mavenCentral()
}
configurations { pps }
dependencies {
    ['auth','iap','friend','social','achievement','leaderboard','push'].each {
        pps "com.pico.pps:platform-service-${it}:1.0.0"
    }
}
tasks.register('copyAll', Copy) { from configurations.pps; into 'out' }
G
(cd "$WORK/pps" && gradle -q copyAll)

echo "==> unpacking classes"
mkdir -p "$WORK/cp"
for a in "$WORK"/pps/out/*.aar; do
  d="$WORK/x/$(basename "$a" .aar)"; mkdir -p "$d"
  (cd "$d" && unzip -oq "$a" classes.jar 2>/dev/null && mv classes.jar "$WORK/cp/$(basename "$a" .aar).jar") || true
done
cp "$WORK"/pps/out/*.jar "$WORK/cp/" 2>/dev/null || true

echo "==> running nitrogen"
for p in "${PKGS[@]}"; do
  (cd "$REPO/packages/expo-pico-$p" && yarn --silent nitrogen >/dev/null)
done

fail=0
for p in "${PKGS[@]}"; do
  gen="$REPO/packages/expo-pico-$p/nitrogen/generated/android/kotlin"
  impl="$REPO/packages/expo-pico-$p/android/src/nitro"
  [ -d "$impl" ] || { echo "SKIP  $p (no src/nitro)"; continue; }
  CP="$(ls "$WORK"/cp/*.jar | tr '\n' ':')"
  if kotlinc -cp "$CP" -d "$WORK/$p.jar" $(find "$gen" "$impl" -name '*.kt') 2>&1 | grep -q "error:"; then
    echo "FAIL  $p"; fail=1
  else
    echo "OK    $p"
  fi
done
exit $fail
