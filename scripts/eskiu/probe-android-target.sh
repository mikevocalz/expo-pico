#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ESKIUC_BIN="${ESKIUC:-$(command -v eskiuc || true)}"
NDK_ROOT="${ANDROID_NDK_HOME:-${ANDROID_NDK_ROOT:-}}"
API="${NDK_API:-26}"
WORK="${TMPDIR:-/tmp}/expo-pico-eskiu-android-probe"

if [[ -z "$ESKIUC_BIN" ]]; then
  echo "error: eskiuc not found; set ESKIUC=/path/to/eskiuc" >&2
  exit 2
fi
if [[ -z "$NDK_ROOT" || ! -d "$NDK_ROOT" ]]; then
  echo "error: ANDROID_NDK_HOME/ANDROID_NDK_ROOT is not set to an NDK" >&2
  exit 2
fi

rm -rf "$WORK"
mkdir -p "$WORK"

"$ESKIUC_BIN" --version
"$ESKIUC_BIN" "$ROOT/packages/internal/pico-eskiu-runtime/src/pico_runtime.esk"   -c -o "$WORK/pico_runtime.o" --target aarch64-linux-android

PREBUILT_DIR="$(find "$NDK_ROOT/toolchains/llvm/prebuilt" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
[[ -n "$PREBUILT_DIR" ]] || { echo "error: NDK LLVM toolchain not found" >&2; exit 3; }

READELF="$PREBUILT_DIR/bin/llvm-readelf"
CLANG="$PREBUILT_DIR/bin/aarch64-linux-android${API}-clang"
NM="$PREBUILT_DIR/bin/llvm-nm"

"$READELF" -h "$WORK/pico_runtime.o"
"$CLANG" -shared "$WORK/pico_runtime.o" -o "$WORK/libexpo_pico_eskiu.so"
"$READELF" -h "$WORK/libexpo_pico_eskiu.so"
"$NM" -g --defined-only "$WORK/libexpo_pico_eskiu.so" | grep "pico_eskiu_abi_version"
"$NM" -g --defined-only "$WORK/libexpo_pico_eskiu.so" | grep "pico_eskiu_android_probe"

echo "expo-pico Eskiu Android target probe: PASS"
