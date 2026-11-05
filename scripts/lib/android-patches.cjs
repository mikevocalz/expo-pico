/**
 * The repo-owned AGP 9 patches in scripts/patches/android/ and the one routine
 * that applies them. Two callers share it so they cannot drift apart:
 *
 * - scripts/patch-android-deps.js (postinstall) patches node_modules.
 * - scripts/build-release-branches.mjs patches the packed expo-horizon-core
 *   that ships on release/horizon-core.
 *
 * Each patch is named `<package>@<exact-version>.patch`; the version in the
 * name is the contract.
 */
const { execFileSync } = require('child_process');
const { existsSync, readFileSync, readdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const PATCH_DIR = join(__dirname, '..', 'patches', 'android');
const PATCH_NAME_RE = /^(.+)@(\d+\.\d+\.\d+(?:-[^\s]+)?)\.patch$/;

/** Every `<package>@<version>.patch` file, parsed. Throws on a misnamed file. */
function listPatches(dir = PATCH_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.patch'))
    .map((file) => {
      const m = file.match(PATCH_NAME_RE);
      if (!m)
        throw new Error(`patch filename '${file}' must be '<package>@<exact-version>.patch'.`);
      return { file, pkg: m[1], version: m[2], path: join(dir, file) };
    });
}

/** The patch for exactly `pkg@version`, or undefined when the repo has none. */
function patchFor(pkg, version, dir = PATCH_DIR) {
  return listPatches(dir).find((p) => p.pkg === pkg && p.version === version);
}

function gitApply(args, cwd) {
  return execFileSync('git', ['apply', ...args], { cwd, stdio: 'pipe' });
}

/**
 * Applies `patchPath` inside `pkgDir`. Returns 'applied' or 'already-applied'
 * (detected with `git apply --check -R`), so repeated runs are safe. Throws
 * with git's message when the patch does not apply cleanly.
 */
function applyPatch(pkgDir, patchPath) {
  try {
    gitApply(['--check', '-R', patchPath], pkgDir);
    return 'already-applied';
  } catch {
    /* not applied yet */
  }
  try {
    gitApply(['--check', patchPath], pkgDir);
    gitApply([patchPath], pkgDir);
    return 'applied';
  } catch (err) {
    const detail = err.stderr ? err.stderr.toString().trim() : String(err);
    throw new Error(`${patchPath} does not apply cleanly in ${pkgDir}:\n${detail}`);
  }
}

/**
 * Makes a packed expo-horizon-core `version` build under AGP 9:
 * - turns on buildFeatures.buildConfig when upstream does not (57.x), because
 *   the module reads BuildConfig.META_HORIZON_APP_ID;
 * - applies scripts/patches/android/expo-horizon-core@<version>.patch when the
 *   repo has one (58.0.1 renames `lintOptions` to `lint`);
 * - fails if `lintOptions` survives, since AGP 9 rejects it.
 */
function prepareHorizonCore(stageDir, version, dir = PATCH_DIR) {
  const gradleFile = join(stageDir, 'android/build.gradle');
  const gradle = readFileSync(gradleFile, 'utf8');
  if (!gradle.includes('buildConfig true')) {
    const patched = gradle.replace(
      /^android \{\n/m,
      'android {\n  // AGP 9 no longer generates BuildConfig by default; META_HORIZON_APP_ID needs it.\n' +
        '  buildFeatures {\n    buildConfig true\n  }\n'
    );
    if (patched === gradle) throw new Error('expo-horizon-core: android { anchor not found');
    writeFileSync(gradleFile, patched);
  }

  const patch = patchFor('expo-horizon-core', version, dir);
  if (patch) applyPatch(stageDir, patch.path);

  if (/\blintOptions\s*\{/.test(readFileSync(gradleFile, 'utf8'))) {
    throw new Error(
      `expo-horizon-core@${version}: android/build.gradle still uses lintOptions, which AGP 9 ` +
        `removed. Add scripts/patches/android/expo-horizon-core@${version}.patch.`
    );
  }
}

module.exports = { PATCH_DIR, listPatches, patchFor, applyPatch, prepareHorizonCore };
