// ExpoPicoEskiu.cmake must build with the eskiuc version pinned in
// cmake/eskiu-version.txt and nothing else. Each case runs the lookup in
// `cmake -P` against fake compilers that only answer `--version`.
//
//   node --test scripts/eskiu-cmake-pin.test.mjs     (needs cmake on PATH)

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CMAKE_DIR = join(ROOT, 'packages/internal/pico-eskiu-runtime/cmake');
// Resolved once from the caller's PATH; each case runs with its own PATH.
const CMAKE = spawnSync('sh', ['-c', 'command -v cmake'], { encoding: 'utf8' }).stdout.trim();
const PINNED = readFileSync(join(CMAKE_DIR, 'eskiu-version.txt'), 'utf8').trim();

let work;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), 'eskiu-pin-'));
});
afterEach(() => rmSync(work, { recursive: true, force: true }));

/** A fake eskiuc in <dir> that reports <version>. Returns its path. */
function fakeEskiuc(dir, version) {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'eskiuc');
  writeFileSync(path, `#!/bin/sh\necho "Eskiu ${version} (LLVM 22.1.8)"\n`);
  chmodSync(path, 0o755);
  return path;
}

/** Runs expo_pico_find_eskiuc with the given environment. */
function findEskiuc({ home, path = '/usr/bin:/bin', eskiuc } = {}) {
  const script = join(work, 'find.cmake');
  writeFileSync(
    script,
    `include("${join(CMAKE_DIR, 'ExpoPicoEskiu.cmake')}")\n` +
      'expo_pico_find_eskiuc(found)\n' +
      'message(STATUS "FOUND=${found}")\n'
  );
  const env = { PATH: path, HOME: home ?? join(work, 'home') };
  if (eskiuc) env.ESKIUC = eskiuc;
  const result = spawnSync(CMAKE, ['-P', script], { env, encoding: 'utf8' });
  const output = `${result.stdout}${result.stderr}`;
  const found = output.match(/FOUND=(\S+)/)?.[1] ?? null;
  return { status: result.status, output, found };
}

function assertFatalWithFix(result) {
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /scripts\/install-eskiuc\.sh/);
  assert.match(result.output, /ESKIUC=/);
}

test('the version file holds one x.y.z version', () => {
  assert.match(PINNED, /^\d+\.\d+\.\d+$/);
});

test('install-eskiuc.sh reads the same version file instead of its own string', () => {
  const script = readFileSync(join(ROOT, 'scripts/install-eskiuc.sh'), 'utf8');
  assert.match(script, /eskiu-version\.txt/);
  assert.doesNotMatch(script, /ESKIU_VERSION="\d/);
});

test('ESKIUC at the pinned version is used', () => {
  const compiler = fakeEskiuc(join(work, 'custom/bin'), PINNED);
  const result = findEskiuc({ eskiuc: compiler });
  assert.equal(result.status, 0, result.output);
  assert.equal(result.found, compiler);
});

test('ESKIUC at another version is a configure error', () => {
  const compiler = fakeEskiuc(join(work, 'custom/bin'), '0.10.0');
  const result = findEskiuc({ eskiuc: compiler });
  assertFatalWithFix(result);
  assert.match(result.output, /0\.10\.0/);
});

test('~/.local/eskiu-<pinned>/bin wins over an older eskiuc on PATH', () => {
  const home = join(work, 'home');
  const pinned = fakeEskiuc(join(home, `.local/eskiu-${PINNED}/bin`), PINNED);
  const stale = join(home, '.local/eskiu-0.10.0/bin');
  fakeEskiuc(stale, '0.10.0');
  const result = findEskiuc({ home, path: `${stale}:/usr/bin:/bin` });
  assert.equal(result.status, 0, result.output);
  assert.equal(result.found, pinned);
});

test('an eskiuc on PATH at another version is a configure error', () => {
  const stale = join(work, 'home/.local/eskiu-0.10.0/bin');
  fakeEskiuc(stale, '0.10.0');
  const result = findEskiuc({ path: `${stale}:/usr/bin:/bin` });
  assertFatalWithFix(result);
});

test('an eskiuc on PATH at the pinned version is used', () => {
  const dir = join(work, 'elsewhere/bin');
  const compiler = fakeEskiuc(dir, PINNED);
  const result = findEskiuc({ path: `${dir}:/usr/bin:/bin` });
  assert.equal(result.status, 0, result.output);
  assert.equal(result.found, compiler);
});

test('no eskiuc anywhere is a configure error', () => {
  assertFatalWithFix(findEskiuc());
});
