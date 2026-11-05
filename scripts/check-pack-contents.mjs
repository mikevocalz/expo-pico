#!/usr/bin/env node
// Runs `npm pack --dry-run` in every workspace package and fails when a
// tarball carries app or checkout files (scripts/lib/pack-contents.mjs
// FORBIDDEN) or drops a file the Android library build reads.
//
// Run after `yarn build` so generated output is on disk; `yarn test:pack`.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  forbiddenPaths,
  missingPaths,
  packedPathsFromJson,
  referencedGeneratedFiles,
  requiredFiles,
  trackedFiles,
} from './lib/pack-contents.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const dirs = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).workspaces.filter((dir) =>
  dir.startsWith('packages/')
);

let failed = 0;
for (const dir of dirs) {
  const pkgDir = join(ROOT, dir);
  const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: pkgDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024,
  });
  const packed = packedPathsFromJson(out);
  const bad = forbiddenPaths(packed);
  const missing = missingPaths(packed, [
    ...requiredFiles(trackedFiles(pkgDir)),
    ...referencedGeneratedFiles(pkgDir),
  ]);
  if (bad.length || missing.length) {
    failed++;
    console.error(`FAIL ${dir} (${packed.length} files)`);
    for (const path of bad) console.error(`  ships ${path}`);
    for (const path of missing) console.error(`  missing ${path}`);
  } else {
    console.log(`ok   ${dir} (${packed.length} files)`);
  }
}
if (failed) {
  console.error(`\n${failed} package(s) failed the pack contents check`);
  process.exit(1);
}
