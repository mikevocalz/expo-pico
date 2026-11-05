// Packages that ship Nitrogen output include headers from the Nitro version
// that generated it (nightly.120 added JCallback.hpp, for example). Their
// Nitro peer ranges must therefore start at the pinned devDependency, so an
// app with an older Nitro gets a peer warning instead of a C++ build failure.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const NITRO_PEERS = ['react-native-nitro-modules', 'nitro-core'];

const generated = readJson(join(ROOT, 'package.json'))
  .workspaces.filter((dir) => existsSync(join(ROOT, dir, 'nitrogen/generated')))
  .map((dir) => ({ dir, manifest: readJson(join(ROOT, dir, 'package.json')) }));

test('some workspaces ship Nitrogen output', () => {
  assert.ok(generated.length > 0, 'no workspace has nitrogen/generated; the check below is empty');
});

for (const { dir, manifest } of generated) {
  test(`${dir}: Nitro peer ranges start at the pinned Nitro`, () => {
    const pin = manifest.devDependencies?.['react-native-nitro-modules'];
    assert.match(
      pin ?? '',
      /^\d+\.\d+\.\d+/,
      'devDependencies must pin react-native-nitro-modules'
    );
    for (const dep of NITRO_PEERS) {
      assert.equal(
        manifest.devDependencies?.[dep],
        pin,
        `devDependencies.${dep} must equal ${pin}`
      );
      assert.equal(
        manifest.peerDependencies?.[dep],
        `>=${pin}`,
        `peerDependencies.${dep} must be >=${pin}`
      );
    }
  });
}

test('every Nitro package and the example pin the same Nitro', () => {
  const example = readJson(join(ROOT, 'example/package.json')).dependencies;
  const pins = new Set(
    generated.map(({ manifest }) => manifest.devDependencies?.['react-native-nitro-modules'])
  );
  for (const dep of NITRO_PEERS) pins.add(example[dep]);
  assert.equal(pins.size, 1, `Nitro pins differ: ${[...pins].join(', ')}`);
});
