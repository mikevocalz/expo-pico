#!/usr/bin/env bash
# Installs a pinned eskiuc release without sudo.
#
#   scripts/install-eskiuc.sh [prefix]     (default prefix: ~/.local/eskiu-<version>)
#
# Downloads the release tarball, checks it against the SHA-256 pinned below and
# against the release's SHA256SUMS, then unpacks it into the prefix. Prints the
# compiler path; under GitHub Actions it also exports ESKIUC and adds bin/ to PATH.
#
# The version lives in packages/internal/pico-eskiu-runtime/cmake/eskiu-version.txt,
# which ExpoPicoEskiu.cmake also reads to reject any other eskiuc. Bump it there
# and update the three checksums below together.
set -euo pipefail

VERSION_FILE="$(cd "$(dirname "$0")/.." && pwd)/packages/internal/pico-eskiu-runtime/cmake/eskiu-version.txt"
ESKIU_VERSION="$(tr -d '[:space:]' < "$VERSION_FILE")"
REPO="eskiu-lang/eskiu"

case "$(uname -s)-$(uname -m)" in
  Darwin-arm64)
    ASSET="eskiuc-macos-arm64.tar.gz"
    SHA256="70c3630d8a5ea4cc34c3dfffc3fc93e1b0e780a6a1faea138d832f8c1d894f92" ;;
  Linux-x86_64)
    ASSET="eskiuc-linux-x86_64.tar.gz"
    SHA256="b3ccb5fedd92bc6cb0dee1580464d183696aeba97155299ee4ecb9ee920e568d" ;;
  Linux-aarch64 | Linux-arm64)
    ASSET="eskiuc-linux-arm64.tar.gz"
    SHA256="055e13099ad6797c0a47a5a7a392d80be40fad7781e81879f4c6880dac37d667" ;;
  *)
    echo "install-eskiuc: no eskiuc ${ESKIU_VERSION} build for $(uname -s)-$(uname -m)" >&2
    exit 1 ;;
esac

PREFIX="${1:-$HOME/.local/eskiu-${ESKIU_VERSION}}"
BASE="https://github.com/${REPO}/releases/download/v${ESKIU_VERSION}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

curl -fsSL --retry 3 -o "$WORK/$ASSET" "$BASE/$ASSET"
curl -fsSL --retry 3 -o "$WORK/SHA256SUMS" "$BASE/SHA256SUMS"

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

ACTUAL="$(sha256 "$WORK/$ASSET")"
if [ "$ACTUAL" != "$SHA256" ]; then
  echo "install-eskiuc: $ASSET sha256 $ACTUAL does not match pinned $SHA256" >&2
  exit 1
fi
LISTED="$(awk -v f="$ASSET" '$2 == f { print $1 }' "$WORK/SHA256SUMS")"
if [ "$LISTED" != "$SHA256" ]; then
  echo "install-eskiuc: SHA256SUMS lists '$LISTED' for $ASSET, pinned $SHA256" >&2
  exit 1
fi

mkdir -p "$PREFIX"
tar --no-same-owner -xzf "$WORK/$ASSET" -C "$PREFIX"
ESKIUC_PATH="$PREFIX/bin/eskiuc"
"$ESKIUC_PATH" --version

if [ -n "${GITHUB_ENV:-}" ]; then echo "ESKIUC=$ESKIUC_PATH" >> "$GITHUB_ENV"; fi
if [ -n "${GITHUB_PATH:-}" ]; then echo "$PREFIX/bin" >> "$GITHUB_PATH"; fi
echo "$ESKIUC_PATH"
