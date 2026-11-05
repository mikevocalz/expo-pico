import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { applyPatch, patchFor, prepareHorizonCore } = require('./lib/android-patches.cjs');

const FIXTURES = new URL('./fixtures/', import.meta.url).pathname;

// Copies the pristine upstream package fixture into a scratch stage dir, the
// same shape build-release-branches.mjs gets from `npm pack`.
function stage(fixture) {
  const dir = mkdtempSync(join(tmpdir(), 'android-patches-test-'));
  cpSync(join(FIXTURES, fixture), dir, { recursive: true });
  return dir;
}

test('release staging renames lintOptions in expo-horizon-core 58.0.1', (t) => {
  const dir = stage('expo-horizon-core@58.0.1');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const before = readFileSync(join(dir, 'android/build.gradle'), 'utf8');
  // The fixture is upstream as published: buildConfig on, lintOptions still there.
  assert.match(before, /buildConfig true/);
  assert.match(before, /lintOptions \{/);

  prepareHorizonCore(dir, '58.0.1');

  const after = readFileSync(join(dir, 'android/build.gradle'), 'utf8');
  assert.doesNotMatch(after, /lintOptions/);
  assert.match(after, /^ {2}lint \{\n {4}abortOnError false\n {2}\}$/m);
});

test('release staging and postinstall use the same patch file', () => {
  const patch = patchFor('expo-horizon-core', '58.0.1');
  assert.ok(patch, 'scripts/patches/android/expo-horizon-core@58.0.1.patch is missing');
  const dir = stage('expo-horizon-core@58.0.1');
  try {
    assert.equal(applyPatch(dir, patch.path), 'applied');
    assert.equal(applyPatch(dir, patch.path), 'already-applied');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('release staging adds buildConfig when upstream lacks it', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'android-patches-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'android'));
  writeFileSync(
    join(dir, 'android/build.gradle'),
    'android {\n  namespace "expo.modules.horizon"\n}\n'
  );
  // No patch exists for this made-up version, so only the injection runs.
  prepareHorizonCore(dir, '0.0.0-test');
  assert.match(readFileSync(join(dir, 'android/build.gradle'), 'utf8'), /buildConfig true/);
});

test('release staging fails when lintOptions has no patch', (t) => {
  const dir = stage('expo-horizon-core@58.0.1');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.throws(() => prepareHorizonCore(dir, '0.0.0-test'), /still uses lintOptions/);
});
