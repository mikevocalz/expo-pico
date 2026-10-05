#!/usr/bin/env node
/**
 * Applies the repo-owned AGP 9 compatibility patches to node_modules after
 * install. Each file in scripts/patches/android/ is a unified diff named
 * `<package>@<exact-version>.patch` — the version in the name is the contract:
 * if the installed version differs, the patch context may silently misapply, so
 * we fail loudly instead of producing a broken Android build.
 *
 * Idempotent: an already-applied patch is detected via `git apply --check -R`
 * and skipped, so repeated installs/postinstalls are safe.
 *
 * To update a patch when upstream releases a fix: bump the dep, rename the
 * patch file to the new version, and regenerate it with:
 *   diff -u <pristine-file> <patched-file> | sed -e '1s|^--- .*|--- a/<relpath>|' -e '2s|^+++ .*|+++ b/<relpath>|'
 */
const { execFileSync } = require('child_process');
const { readdirSync, readFileSync, existsSync } = require('fs');
const { dirname, join } = require('path');

const repoRoot = join(__dirname, '..');
const patchDir = join(__dirname, 'patches', 'android');

const patchNameRe = /^(.+)@(\d+\.\d+\.\d+(?:-[^\s]+)?)\.patch$/;

function gitApply(args, cwd) {
  return execFileSync('git', ['apply', ...args], { cwd, stdio: 'pipe' });
}

function fail(msg) {
  console.error(`\n[patch-android-deps] ERROR: ${msg}\n`);
  process.exitCode = 1;
}

if (!existsSync(patchDir)) {
  console.log('[patch-android-deps] no patches directory; nothing to do.');
  process.exit(0);
}

const patchFiles = readdirSync(patchDir).filter((f) => f.endsWith('.patch'));
if (patchFiles.length === 0) {
  process.exit(0);
}

for (const file of patchFiles) {
  const m = file.match(patchNameRe);
  if (!m) {
    fail(`patch filename '${file}' must be '<package>@<exact-version>.patch'.`);
    continue;
  }
  const [, pkg, expectedVersion] = m;
  const patchPath = join(patchDir, file);

  let pkgDir;
  try {
    pkgDir = dirname(require.resolve(`${pkg}/package.json`, { paths: [repoRoot] }));
  } catch {
    fail(`${pkg} is not installed — the patch has no target. ` +
      `Restore the dependency or delete scripts/patches/android/${file}.`);
    continue;
  }

  const installedVersion = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version;
  if (installedVersion !== expectedVersion) {
    fail(`${pkg}@${installedVersion} installed but the patch targets ${expectedVersion}. ` +
      `Upstream may have fixed the issue — verify, then update or delete scripts/patches/android/${file}.`);
    continue;
  }

  // Already applied? --check -R succeeds iff the patch can be reversed.
  try {
    gitApply(['--check', '-R', patchPath], pkgDir);
    console.log(`[patch-android-deps] ${pkg}@${installedVersion}: already applied, skipping.`);
    continue;
  } catch {
    /* not applied yet — fall through */
  }

  try {
    gitApply(['--check', patchPath], pkgDir);
    gitApply([patchPath], pkgDir);
    console.log(`[patch-android-deps] ${pkg}@${installedVersion}: applied ${file}.`);
  } catch (err) {
    const detail = err.stderr ? err.stderr.toString().trim() : String(err);
    fail(`${pkg}@${expectedVersion}: patch does not apply cleanly — ` +
      `the upstream file changed under us. Regenerate scripts/patches/android/${file}.\n${detail}`);
  }
}

if (process.exitCode) {
  console.error('[patch-android-deps] one or more patches failed — fix before building Android.\n');
}
