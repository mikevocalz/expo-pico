#!/usr/bin/env bash
# Installs a pinned eskiuc release without sudo.
#
#   scripts/install-eskiuc.sh [prefix]     (default prefix: ~/.local/eskiu-<version>)
#
# Downloads the release tarball, checks it against the SHA-256 pinned below and
# against the release's SHA256SUMS, then unpacks it into the prefix. Prints the
# compiler path; under GitHub Actions it also exports ESKIUC and adds bin/ to PATH.
set -euo pipefail

ESKIU_VERSION="0.9.3"
REPO="doranteseduardo/eskiu"

case "$(uname -s)-$(uname -m)" in
  Darwin-arm64)
    ASSET="eskiuc-macos-arm64.tar.gz"
    SHA256="8eb0216c7aca4d347388227479e5f1e36e1fc03e4fe88592536b4e84d266c6d0" ;;
  Linux-x86_64)
    ASSET="eskiuc-linux-x86_64.tar.gz"
    SHA256="b5216cc8118a6caf06ec540b8663c2aa94efeb4a99158a74b05928f8e0d304a1" ;;
  Linux-aarch64 | Linux-arm64)
    ASSET="eskiuc-linux-arm64.tar.gz"
    SHA256="0ced81adde0215673eb98852f327137598aa6c44f84a285e24a93af2643860bc" ;;
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
tar -xzf "$WORK/$ASSET" -C "$PREFIX"
ESKIUC_PATH="$PREFIX/bin/eskiuc"
"$ESKIUC_PATH" --version

if [ -n "${GITHUB_ENV:-}" ]; then echo "ESKIUC=$ESKIUC_PATH" >> "$GITHUB_ENV"; fi
if [ -n "${GITHUB_PATH:-}" ]; then echo "$PREFIX/bin" >> "$GITHUB_PATH"; fi
echo "$ESKIUC_PATH"
