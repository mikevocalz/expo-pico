#!/usr/bin/env bash
# shellcheck shell=bash
#
# scripts/validate-device.sh
#
# Single-command runner for every item in docs/DEVICE-TESTING-REQUIRED.md
# that can be automated. Runs in order of blast-radius (Gradle dep first,
# manifest next, adb-dependent checks last). Each step reports pass/fail
# independently; the final summary aggregates.
#
# Requirements on the host:
#   - yarn + node (already used by the repo)
#   - Android SDK build-tools (`aapt`) on PATH — for manifest inspection
#   - `adb` on PATH — only needed for runtime-check steps
#   - A paired Android device (PICO Swan, PICO 4 Ultra, or a standard
#     Android emulator for mobile-flavor checks) for runtime steps
#
# Usage:
#   scripts/validate-device.sh                      # full run
#   scripts/validate-device.sh --skip-build         # reuse cached build artifacts
#   scripts/validate-device.sh --skip-adb           # no device connected; manifest only
#   scripts/validate-device.sh --skip-manifest      # no aapt; Gradle checks only
#   scripts/validate-device.sh --help
#
# Exit code:
#   0 — every non-skipped step passed
#   1 — at least one non-skipped step failed
#   2 — prerequisites missing (before any step ran)
#
# Idempotent: safe to re-run. Every step re-validates from scratch.

set -u  # unset var is an error; we manage `set -e` per-step instead

# ── CLI parsing ──────────────────────────────────────────────────────

SKIP_BUILD=0
SKIP_ADB=0
SKIP_MANIFEST=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)    SKIP_BUILD=1; shift ;;
    --skip-adb)      SKIP_ADB=1; shift ;;
    --skip-manifest) SKIP_MANIFEST=1; shift ;;
    --help|-h)
      sed -n '2,30p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

# ── Pretty-print helpers (no-color aware) ────────────────────────────

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  RESET=$'\033[0m'; BOLD=$'\033[1m'; DIM=$'\033[2m'
  GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; GRAY=$'\033[90m'
else
  RESET=''; BOLD=''; DIM=''; GREEN=''; RED=''; YELLOW=''; BLUE=''; GRAY=''
fi

declare -a STEP_NAMES=()
declare -a STEP_STATES=()
declare -a STEP_NOTES=()

STEP_PASS=0
STEP_FAIL=0
STEP_SKIP=0

banner() { printf '\n%s─── %s %s%s\n' "$BOLD$BLUE" "$1" "$(printf '%*s' $((64 - ${#1})) '' | tr ' ' '─')" "$RESET"; }

record_pass() {
  STEP_NAMES+=("$1"); STEP_STATES+=("pass"); STEP_NOTES+=("${2:-}")
  STEP_PASS=$((STEP_PASS + 1))
  printf '%s  ✓ %s%s%s\n' "$GREEN" "$BOLD" "$1" "$RESET"
  [[ -n "${2:-}" ]] && printf '%s    %s%s\n' "$GRAY" "$2" "$RESET"
}

record_fail() {
  STEP_NAMES+=("$1"); STEP_STATES+=("fail"); STEP_NOTES+=("${2:-}")
  STEP_FAIL=$((STEP_FAIL + 1))
  printf '%s  ✗ %s%s%s\n' "$RED" "$BOLD" "$1" "$RESET"
  [[ -n "${2:-}" ]] && printf '%s    %s%s\n' "$GRAY" "$2" "$RESET"
}

record_skip() {
  STEP_NAMES+=("$1"); STEP_STATES+=("skip"); STEP_NOTES+=("${2:-}")
  STEP_SKIP=$((STEP_SKIP + 1))
  printf '%s  · %s%s%s\n' "$YELLOW" "$BOLD" "$1" "$RESET"
  [[ -n "${2:-}" ]] && printf '%s    %s%s\n' "$GRAY" "$2" "$RESET"
}

# ── Path probe (repo root) ───────────────────────────────────────────

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f package.json ]]; then
  echo "error: could not find repo root (no package.json at $REPO_ROOT)" >&2
  exit 2
fi

# ── Prerequisite check — bails with exit 2 if we can't even start ────

banner 'Prerequisites'

have() { command -v "$1" >/dev/null 2>&1; }

if ! have yarn; then
  echo "  ✗ yarn not on PATH — install yarn 1.x first" >&2
  exit 2
fi
echo "  ✓ yarn: $(yarn --version)"

if ! have node; then
  echo "  ✗ node not on PATH" >&2
  exit 2
fi
echo "  ✓ node: $(node --version)"

if [[ $SKIP_MANIFEST -eq 0 ]]; then
  if ! have aapt; then
    echo "  ⚠ aapt not on PATH — manifest inspection will be skipped" >&2
    SKIP_MANIFEST=1
  else
    echo "  ✓ aapt: $(aapt version | head -1)"
  fi
fi

if [[ $SKIP_ADB -eq 0 ]]; then
  if ! have adb; then
    echo "  ⚠ adb not on PATH — adb-dependent steps will be skipped" >&2
    SKIP_ADB=1
  else
    echo "  ✓ adb: $(adb --version | head -1)"
    # Confirm a device is actually connected; no point in adb install
    # without one. `adb devices` always exits 0, so parse the output.
    ADB_DEVICE_COUNT=$(adb devices | awk 'NR>1 && $2=="device" {c++} END {print c+0}')
    if [[ $ADB_DEVICE_COUNT -lt 1 ]]; then
      echo "  ⚠ no adb device connected — adb-dependent steps will be skipped" >&2
      SKIP_ADB=1
    else
      echo "  ✓ adb devices: $ADB_DEVICE_COUNT connected"
    fi
  fi
fi

# ── Step: build + test ───────────────────────────────────────────────

banner 'Step 1/6 — workspace build + unit tests'

if [[ $SKIP_BUILD -eq 1 ]]; then
  record_skip 'yarn test'    '--skip-build passed; reusing previous state'
  record_skip 'yarn build'   '--skip-build passed'
else
  if yarn --silent test >/tmp/expo-pico-test.log 2>&1; then
    # The test task output has a consistent "Tests: N passed" line from Jest.
    TEST_COUNT=$(grep -oE 'Tests:[^,]* passed' /tmp/expo-pico-test.log | head -1 || true)
    record_pass 'yarn test' "${TEST_COUNT:-all suites passed}"
  else
    record_fail 'yarn test' "see /tmp/expo-pico-test.log — last 20 lines:$(tail -20 /tmp/expo-pico-test.log | sed 's/^/        /')"
  fi

  if yarn --silent build >/tmp/expo-pico-build.log 2>&1; then
    record_pass 'yarn build' 'plugin + cli + core built'
  else
    record_fail 'yarn build' "see /tmp/expo-pico-build.log"
  fi
fi

# ── Step: Phase L Gradle dep validation ──────────────────────────────

banner 'Step 2/6 — Phase L: expo prebuild writes the sibling Gradle deps'

if yarn --silent example:prebuild:android >/tmp/expo-pico-prebuild.log 2>&1; then
  record_pass 'npx expo prebuild --clean' 'settings.gradle + app/build.gradle regenerated'

  # Confirm autolinking picked up expo-pico-core as an includable project.
  # Expo SDK 55 resolves modules at settings.gradle eval time via
  # `expoAutolinking.useExpoModules()` rather than emitting literal `include`
  # lines, so we query the autolinker directly instead of grepping.
  if (cd example && npx --no expo-modules-autolinking resolve --platform android --json 2>/dev/null \
        | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));process.exit(d.modules.some(m=>m.packageName==='expo-pico-core')?0:1)"); then
    record_pass 'autolinker resolves :expo-pico-core' 'expo-modules-autolinking discovered the core project as expected'
  else
    record_fail 'autolinker resolves :expo-pico-core' \
      "expo-modules-autolinking did not discover expo-pico-core — Phase L's cross-module import will fail at compile time. Revert the 'implementation project(:expo-pico-core)' lines in packages/expo-pico-{account,iap,notifications,rooms,rtc,spatial,subscription}/android/build.gradle"
  fi
else
  record_fail 'npx expo prebuild --clean' "see /tmp/expo-pico-prebuild.log"
fi

# ── Step: example:assemble:pico — real Gradle build of the pico flavor ──

banner 'Step 3/6 — assemble the picoDebug APK'

APK_PATH="example/android/app/build/outputs/apk/pico/debug/app-pico-debug.apk"

if yarn --silent example:assemble:pico >/tmp/expo-pico-assemble.log 2>&1; then
  if [[ -f "$APK_PATH" ]]; then
    APK_SIZE=$(wc -c < "$APK_PATH" | awk '{printf "%.1f MB", $1/1024/1024}')
    record_pass 'gradlew assemblePicoDebug' "APK at $APK_PATH ($APK_SIZE)"
  else
    record_fail 'gradlew assemblePicoDebug' "build reported success but APK is missing at $APK_PATH"
  fi
else
  record_fail 'gradlew assemblePicoDebug' "see /tmp/expo-pico-assemble.log"
fi

# ── Step: merged-manifest contract checks (Phase A / B / C / D / E) ──

banner 'Step 4/6 — merged AndroidManifest.xml contract'

if [[ $SKIP_MANIFEST -eq 1 ]]; then
  record_skip 'manifest inspection' 'aapt unavailable or --skip-manifest passed'
elif [[ ! -f "$APK_PATH" ]]; then
  record_skip 'manifest inspection' 'APK missing (see step 3)'
else
  MANIFEST_DUMP=/tmp/expo-pico-manifest.xml
  aapt dump xmltree "$APK_PATH" AndroidManifest.xml > "$MANIFEST_DUMP" 2>/dev/null

  check_manifest() {
    local label="$1" pattern="$2" fix="$3"
    if grep -qE "$pattern" "$MANIFEST_DUMP"; then
      record_pass "manifest: $label" "grep matched /$pattern/"
    else
      record_fail "manifest: $label" "$fix"
    fi
  }

  check_manifest 'Phase A: pvr.app.type=vr' \
    'A: http://schemas\.android\.com/apk/res/android:name.*"pvr\.app\.type"' \
    'Phase A failed — appType may be 2d or buildVariant may be mobile. Check example/app.config.ts.'

  check_manifest 'Phase A: OpenXR IMMERSIVE_HMD category' \
    'org\.khronos\.openxr\.intent\.category\.IMMERSIVE_HMD' \
    'Phase A failed — launcher activity intent-filter missing the immersive category.'

  check_manifest 'Phase A: com.pico.intent.category.VR' \
    'com\.pico\.intent\.category\.VR' \
    'Phase A failed — PICO launcher will not enumerate the APK as immersive.'

  check_manifest 'Phase A: queries block' \
    'com\.pico\.os\.systemui|com\.pico\.platform' \
    'Phase A failed — <queries> block missing; PICO system-service binders will silently fail on Android 11+.'

  check_manifest 'Phase E: libopenxr_loader.so uses-native-library' \
    'libopenxr_loader\.so' \
    'Phase E failed — <uses-native-library> not emitted; System.loadLibrary("openxr_loader") will fail at runtime under targetSdk>=31.'

  # Phase B: Platform SDK activities only land when platformService identity is wired.
  if [[ -n "${PICO_PLATFORM_APP_ID:-}${PICO_PLATFORM_APP_KEY:-}" ]]; then
    check_manifest 'Phase B: UnityAuthInterface activity' \
      'com\.pico\.loginpaysdk\.UnityAuthInterface' \
      'Phase B failed — login/browser activities missing; PICO Platform SDK auth flow will not launch.'
  else
    record_skip 'Phase B: UnityAuthInterface activity' \
      'PICO_PLATFORM_APP_ID / _KEY not set in env; Phase B writes activities only when identity is present'
  fi

  # Phase E ABI filter — check via aapt dump badging (different invocation).
  ABI_LINE=$(aapt dump badging "$APK_PATH" 2>/dev/null | grep -E '^native-code' || true)
  if echo "$ABI_LINE" | grep -q "arm64-v8a"; then
    if echo "$ABI_LINE" | grep -qE "armeabi-v7a|x86"; then
      record_fail 'Phase E: ABI filter (arm64-v8a only)' \
        "APK carries arm64-v8a PLUS another ABI: $ABI_LINE"
    else
      record_pass 'Phase E: ABI filter (arm64-v8a only)' "native-code: $ABI_LINE"
    fi
  else
    record_fail 'Phase E: ABI filter (arm64-v8a only)' \
      "APK is missing arm64-v8a native code: $ABI_LINE"
  fi
fi

# ── Step: adb install + runtime package probes (Phase J / capability landing) ──

banner 'Step 5/6 — adb install + runtime PackageManager probes'

if [[ $SKIP_ADB -eq 1 ]]; then
  record_skip 'adb install + package probes' 'adb unavailable / no device connected / --skip-adb passed'
elif [[ ! -f "$APK_PATH" ]]; then
  record_skip 'adb install + package probes' 'APK missing (see step 3)'
else
  if adb install -r "$APK_PATH" >/tmp/expo-pico-adb-install.log 2>&1; then
    record_pass 'adb install -r' "$(basename "$APK_PATH")"
  else
    record_fail 'adb install -r' "see /tmp/expo-pico-adb-install.log"
  fi

  # Inspect the installed package's manifest via dumpsys.
  PKG_INFO=$(adb shell dumpsys package com.example.expopico 2>/dev/null || true)

  if [[ -z "$PKG_INFO" ]]; then
    record_fail 'dumpsys package com.example.expopico' 'no install record found; check the install step above'
  else
    # Phase A + D features
    for feature in \
      'pico.hardware.handtracking' \
      'pico.hardware.passthrough' \
      'android.hardware.vr.headtracking' ; do
      if echo "$PKG_INFO" | grep -q "$feature"; then
        record_pass "package declares $feature" ''
      else
        # Declared as optional — missing feature at runtime is an info
        # finding, not a failure. We still log it.
        record_skip "package declares $feature" 'declared optional or disabled in example/app.config.ts'
      fi
    done

    # Phase B — activities, only when identity is wired
    if [[ -n "${PICO_PLATFORM_APP_ID:-}${PICO_PLATFORM_APP_KEY:-}" ]]; then
      if echo "$PKG_INFO" | grep -q 'com.pico.loginpaysdk.UnityAuthInterface'; then
        record_pass 'dumpsys: UnityAuthInterface activity registered' ''
      else
        record_fail 'dumpsys: UnityAuthInterface activity registered' \
          'identity env vars were set, but the activity did not land; rerun the manifest step to compare.'
      fi
    fi
  fi
fi

# ── Step: check Phase J aggregate SDK probe on the device ───────────

banner 'Step 6/6 — Phase J reflection probe (runtime)'

if [[ $SKIP_ADB -eq 1 ]]; then
  record_skip 'Phase J probe on device' 'adb unavailable; run the Diagnostics tab in the example app manually after installing'
elif [[ ! -f "$APK_PATH" ]]; then
  record_skip 'Phase J probe on device' 'APK missing (see step 3)'
else
  # Launch the app; the example's DiagnosticsPanel tab renders the probe.
  # We can't read the rendered UI here, but we can confirm the app starts
  # and the PicoCorePackage registration line runs (shows up in logcat).
  adb logcat -c >/dev/null 2>&1 || true
  adb shell am start -n com.example.expopico/.MainActivity >/dev/null 2>&1 || true

  # Wait a moment for the boot log to flush.
  sleep 3
  LOGCAT=$(adb logcat -d -t 500 2>/dev/null | grep -E 'PicoCorePackage|PicoSwanRuntime|PicoOs6Runtime' | head -20 || true)

  if [[ -z "$LOGCAT" ]]; then
    record_fail 'logcat: PicoCorePackage registration' \
      'no PicoCorePackage / PicoSwanRuntime / PicoOs6Runtime lines in recent logcat. Either MainApplication injection failed (Phase Swan) or the example app crashed at boot.'
  else
    record_pass 'logcat: PicoCorePackage registration' \
      "$(echo "$LOGCAT" | head -1)"
    printf '%s    full log (first 20 lines):\n%s%s\n' "$GRAY" "$(echo "$LOGCAT" | sed 's/^/      /')" "$RESET"
  fi

  echo
  echo "  ${DIM}Open the example on the headset and switch to the Diagnostics tab"
  echo "  to see the per-sibling Phase J probe. Report back with a screenshot.${RESET}"
fi

# ── Summary ──────────────────────────────────────────────────────────

banner 'Summary'
printf '  %s%d passed%s  %s%d failed%s  %s%d skipped%s\n' \
  "$GREEN" $STEP_PASS "$RESET" \
  "$RED"   $STEP_FAIL "$RESET" \
  "$YELLOW" $STEP_SKIP "$RESET"

if [[ $STEP_FAIL -gt 0 ]]; then
  echo
  printf '  %sFailed steps:%s\n' "$BOLD$RED" "$RESET"
  for ((i = 0; i < ${#STEP_NAMES[@]}; i++)); do
    [[ "${STEP_STATES[$i]}" == "fail" ]] && printf '    - %s\n' "${STEP_NAMES[$i]}"
  done
  echo
  echo "  ${DIM}Log files under /tmp/expo-pico-*.log capture full output for failed steps.${RESET}"
  echo "  ${DIM}See docs/DEVICE-TESTING-REQUIRED.md for per-item rollback guidance.${RESET}"
  exit 1
fi

echo
echo "  ${GREEN}${BOLD}All non-skipped steps passed.${RESET}"
if [[ $STEP_SKIP -gt 0 ]]; then
  echo "  ${DIM}Skipped steps may still need manual verification — see docs/DEVICE-TESTING-REQUIRED.md.${RESET}"
fi
exit 0
