#!/usr/bin/env node
/**
 * Applies the repo-owned AGP 9 compatibility patches to node_modules after
 * install. Each file in scripts/patches/android/ is a unified diff named
 * `<package>@<exact-version>.patch` — the version in the name is the contract:
 * if the installed version differs, the patch context may silently misapply, so
 * we fail loudly instead of producing a broken Android build.
 *
 * The patch list and the apply routine live in scripts/lib/android-patches.cjs,
 * which scripts/build-release-branches.mjs also uses for release/horizon-core.
 *
 * Idempotent: an already-applied patch is detected via `git apply --check -R`
 * and skipped, so repeated installs/postinstalls are safe.
 *
 * To update a patch when upstream releases a fix: bump the dep, rename the
 * patch file to the new version, and regenerate it with:
 *   diff -u <pristine-file> <patched-file> | sed -e '1s|^--- .*|--- a/<relpath>|' -e '2s|^+++ .*|+++ b/<relpath>|'
 */
const { readFileSync } = require('fs');
const { dirname, join } = require('path');
const { PATCH_DIR, listPatches, applyPatch } = require('./lib/android-patches.cjs');

const repoRoot = join(__dirname, '..');

function fail(msg) {
  console.error(`\n[patch-android-deps] ERROR: ${msg}\n`);
  process.exitCode = 1;
}

let patches;
try {
  patches = listPatches(PATCH_DIR);
} catch (err) {
  fail(err.message);
  patches = [];
}

for (const { file, pkg, version: expectedVersion, path: patchPath } of patches) {
  let pkgDir;
  try {
    pkgDir = dirname(require.resolve(`${pkg}/package.json`, { paths: [repoRoot] }));
  } catch {
    fail(
      `${pkg} is not installed — the patch has no target. ` +
        `Restore the dependency or delete scripts/patches/android/${file}.`
    );
    continue;
  }

  const installedVersion = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version;
  if (installedVersion !== expectedVersion) {
    fail(
      `${pkg}@${installedVersion} installed but the patch targets ${expectedVersion}. ` +
        `Upstream may have fixed the issue — verify, then update or delete scripts/patches/android/${file}.`
    );
    continue;
  }

  try {
    if (applyPatch(pkgDir, patchPath) === 'already-applied') {
      console.log(`[patch-android-deps] ${pkg}@${installedVersion}: already applied, skipping.`);
    } else {
      console.log(`[patch-android-deps] ${pkg}@${installedVersion}: applied ${file}.`);
    }
  } catch (err) {
    fail(
      `${pkg}@${expectedVersion}: patch does not apply cleanly — ` +
        `the upstream file changed under us. Regenerate scripts/patches/android/${file}.\n${err.message}`
    );
  }
}

if (process.exitCode) {
  console.error('[patch-android-deps] one or more patches failed — fix before building Android.\n');
}
