// Static half of the pack contents check: each workspace's `files` list,
// applied to its git-tracked files, must not let app or checkout files into
// the tarball and must keep every file the Android library build reads.
// scripts/check-pack-contents.mjs (`yarn test:pack`) repeats this against the
// real `npm pack` output after `yarn build`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  forbiddenPaths,
  missingPaths,
  packedPathsFromJson,
  requiredFiles,
  selectedByFiles,
  trackedFiles,
} from './lib/pack-contents.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const dirs = readJson(join(ROOT, 'package.json')).workspaces.filter((dir) =>
  dir.startsWith('packages/')
);

test('the rules catch an example app shipped inside android/', () => {
  const hits = forbiddenPaths([
    'android/build.gradle',
    'android/src/main/AndroidManifest.xml',
    'android/app/build.gradle',
    'android/app/debug.keystore',
    'android/gradle/wrapper/gradle-wrapper.jar',
    'android/gradlew',
    'android/gradlew.bat',
    'android/settings.gradle',
    'android/gradle.properties',
    'AGENTS.md',
  ]);
  assert.equal(hits.length, 8, hits.join('\n'));
  assert.ok(!hits.some((h) => h.startsWith('android/build.gradle ')));
  assert.ok(!hits.some((h) => h.startsWith('android/src/')));
});

test('extra android/*.gradle scripts are required, settings.gradle is not', () => {
  assert.deepEqual(
    requiredFiles([
      'android/build.gradle',
      'android/one-launcher-tile.gradle',
      'android/settings.gradle',
      'android/app/build.gradle',
      'android/src/main/cpp/a.cpp',
      'android-expo/build.gradle',
      'src/index.ts',
    ]),
    [
      'android/build.gradle',
      'android/one-launcher-tile.gradle',
      'android/src/main/cpp/a.cpp',
      'android-expo/build.gradle',
    ]
  );
});

test('npm pack --json parses on npm 10 and npm 11+', () => {
  const files = [{ path: 'package.json' }];
  assert.deepEqual(packedPathsFromJson(JSON.stringify([{ files }])), ['package.json']);
  assert.deepEqual(packedPathsFromJson(JSON.stringify({ '@expo-pico/x': { files } })), [
    'package.json',
  ]);
  assert.deepEqual(
    packedPathsFromJson(`> prepare\n[nitrogen] done\n${JSON.stringify([{ files }])}`),
    ['package.json']
  );
});

for (const dir of dirs) {
  test(`${dir}: files ships no app or checkout files and keeps the Android build inputs`, () => {
    const pkgDir = join(ROOT, dir);
    const tracked = trackedFiles(pkgDir);
    const selected = selectedByFiles(tracked, readJson(join(pkgDir, 'package.json')).files);
    assert.deepEqual(forbiddenPaths(selected), []);
    assert.deepEqual(missingPaths(selected, requiredFiles(tracked)), []);
  });
}
