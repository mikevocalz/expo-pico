#!/usr/bin/env node
/**
 * Native bridge audit: every @expo-pico package talks to Android through
 * Nitro Modules V1 and nothing else.
 *
 * Reports three kinds of leftovers:
 *   - Expo Modules v2 bridge code (`io.github.expo.modules.v2`, `expoModule { v2 }`,
 *     `requireOptionalNativeModule` in package sources).
 *   - Nitro 0.x API (`NitroModules.createHybridObject`, the `autolinking` block in
 *     nitro.json, `androidCxxLibName`).
 *   - Nitro packages that are not pinned to the one V1 version the workspace uses.
 *
 * `--strict` exits non-zero when anything is reported.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const strict = process.argv.includes('--strict');
const NITRO_PACKAGES = ['react-native-nitro-modules', 'nitrogen', 'nitro-core'];
const SKIP_DIRS = ['node_modules', '.git', 'build', 'dist', '.expo', '.turbo', 'generated'];
const hits = [];
const versions = new Map();

const SOURCE_RULES = [
  { re: /io\.github\.expo\.modules\.v2/, why: 'Expo Modules v2 bridge' },
  { re: /expoModule\s*\{\s*v2/, why: 'Expo Modules v2 gradle block' },
  {
    re: /NitroModules\.createHybridObject\s*\(/,
    why: 'Nitro 0.x createHybridObject (V1 uses `new X()`)',
  },
];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    const rel = relative(root, full);
    if (rel.includes('__jest_stubs__') || rel.includes('__tests__')) continue;
    if (!/\.(json|ts|tsx|js|mjs|gradle|kt|kts|java)$/.test(name)) continue;
    const text = readFileSync(full, 'utf8');

    // Code only: Kotlin/Gradle comments may name the API they replaced.
    const code = /\.(kt|kts|java|gradle)$/.test(name)
      ? text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      : text;
    for (const { re, why } of SOURCE_RULES) if (re.test(code)) hits.push(`${rel}: ${why}`);
    // The example may read third-party Expo modules (expo-horizon-core);
    // only @expo-pico package sources must not.
    if (/^packages\/.*\/src\//.test(rel) && /requireOptionalNativeModule/.test(text)) {
      hits.push(`${rel}: requireOptionalNativeModule (resolve the Nitro HybridObject instead)`);
    }
    if (name === 'nitro.json') {
      const json = JSON.parse(text);
      if ('autolinking' in json) {
        hits.push(`${rel}: nitro.json autolinking block (moved to the spec in V1)`);
      }
      if (json.android && 'androidCxxLibName' in json.android) {
        hits.push(`${rel}: androidCxxLibName (V1 calls it cxxLibName)`);
      }
    }
    if (name === 'package.json') {
      const json = JSON.parse(text);
      for (const section of ['dependencies', 'devDependencies']) {
        for (const pkg of NITRO_PACKAGES) {
          const v = json[section]?.[pkg];
          if (v) versions.set(`${rel} ${section}.${pkg}`, v);
        }
      }
    }
  }
}

walk(join(root, 'packages'));
walk(join(root, 'example'));

const distinct = [...new Set(versions.values())];
if (distinct.length > 1) {
  for (const [where, v] of versions) {
    hits.push(`${where}: ${v} (nitro versions disagree: ${distinct.join(', ')})`);
  }
}
for (const [where, v] of versions) {
  if (!/^1\.\d+\.\d+/.test(v)) hits.push(`${where}: ${v} is not Nitro V1`);
}

const unique = [...new Set(hits)].sort();
console.log(`Native bridge audit (Nitro V1 only): ${unique.length} finding(s)`);
for (const hit of unique) console.log(` - ${hit}`);

if (strict && unique.length) {
  console.error('\nStrict audit failed: every native bridge must be Nitro V1.');
  process.exit(1);
}
