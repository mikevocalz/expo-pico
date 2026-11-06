import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareReleaseManifest } from './lib/release-manifest.mjs';

test('released app templates keep runnable commands and development dependencies', () => {
  const manifest = {
    name: '@expo-pico/template',
    scripts: {
      start: 'expo start',
      'android:pico': 'expo run:android --variant picoDebug',
      prebuild: 'expo prebuild --clean',
      doctor: 'expo-pico-doctor',
      preinstall: 'unexpected setup',
      postinstall: 'unexpected setup',
      prepare: 'unexpected build',
      prepack: 'unexpected build',
      prepublishOnly: 'unexpected build',
    },
    devDependencies: { '@babel/core': '^7.29.0', typescript: '~6.0.3' },
  };
  prepareReleaseManifest(manifest);
  assert.deepEqual(manifest.scripts, {
    start: 'expo start',
    'android:pico': 'expo run:android --variant picoDebug',
    prebuild: 'expo prebuild --clean',
    doctor: 'expo-pico-doctor',
  });
  assert.deepEqual(manifest.devDependencies, { '@babel/core': '^7.29.0', typescript: '~6.0.3' });
});

test('installed libraries need no lifecycle scripts or development dependencies', () => {
  const manifest = {
    name: '@expo-pico/core',
    scripts: { build: 'tsc', prepare: 'yarn build' },
    dependencies: { '@expo/config-plugins': '58.0.12' },
    devDependencies: { typescript: '~6.0.3' },
  };
  prepareReleaseManifest(manifest);
  assert.equal(manifest.scripts, undefined);
  assert.equal(manifest.devDependencies, undefined);
  assert.deepEqual(manifest.dependencies, { '@expo/config-plugins': '58.0.12' });
});
