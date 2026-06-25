#!/usr/bin/env bash
#
# Validate that .vendor/expo-horizon/ stays in sync with upstream
# software-mansion-labs/expo-horizon. Per package, in the UPSTREAM working
# copy:
#   - replace ios/ with the vendored ios/
#   - replace android/src/main with the vendored android/src/main
#   - replace TypeScript src/ with the vendored src/
# then `git diff` in the upstream checkout shows what differs. Nothing in
# THIS repo is changed. The android/src/quest tree is intentionally NOT
# overlaid — it is Horizon-only by design.
#
# Usage:
#   validate-parity.sh <upstream-path>            # show the diff
#   validate-parity.sh <upstream-path> --restore  # undo, leave upstream clean
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
VENDOR_ROOT="${REPO_ROOT}/.vendor/expo-horizon"

UPSTREAM="${1:-}"
MODE="${2:-}"

if [ -z "${UPSTREAM}" ] || [ ! -d "${UPSTREAM}/expo-horizon-core" ]; then
    echo "Usage: $0 <path-to-software-mansion-labs/expo-horizon> [--restore]" >&2
    exit 1
fi

# package directory name (same in our vendor + upstream).
PKGS=(
    "expo-horizon-core"
    "expo-horizon-location"
    "expo-horizon-notifications"
)

if [ "${MODE}" = "--restore" ]; then
    for pkg in "${PKGS[@]}"; do
        git -C "${UPSTREAM}" checkout -- "${pkg}" 2>/dev/null || true
        git -C "${UPSTREAM}" clean -fdq -- "${pkg}" 2>/dev/null || true
    done
    echo "Restored upstream working tree."
    exit 0
fi

for pkg in "${PKGS[@]}"; do
    vendor_root="${VENDOR_ROOT}/${pkg}"
    up_root="${UPSTREAM}/${pkg}"

    if [ ! -d "${vendor_root}" ]; then
        echo "(skip ${pkg}: not in vendor)"
        continue
    fi

    # iOS: straight replace
    if [ -d "${vendor_root}/ios" ]; then
        rm -rf "${up_root}/ios"
        cp -R "${vendor_root}/ios" "${up_root}/ios"
    fi

    # Android: replace shared `src/main` only. `src/quest` is Horizon-only
    # and the comparison would always show diffs we don't care about.
    if [ -d "${vendor_root}/android/src/main" ]; then
        rm -rf "${up_root}/android/src/main"
        mkdir -p "${up_root}/android/src/main"
        cp -R "${vendor_root}/android/src/main/." "${up_root}/android/src/main/"
    fi

    # TypeScript src/: straight replace
    if [ -d "${vendor_root}/src" ]; then
        rm -rf "${up_root}/src"
        cp -R "${vendor_root}/src" "${up_root}/src"
    fi

    echo
    echo "### ${pkg} — NATIVE shared (expect no diff)"
    git -C "${UPSTREAM}" diff -- "${pkg}/ios" "${pkg}/android/src/main" || true
    echo
    echo "### ${pkg} — TYPESCRIPT src/ (review unexpected diffs)"
    git -C "${UPSTREAM}" diff -- "${pkg}/src" || true
done

echo
echo "Done. Undo with: $0 \"${UPSTREAM}\" --restore"
