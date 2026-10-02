#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const strict = process.argv.includes('--strict');
const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', 'build', 'dist', '.expo', '.turbo'].includes(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'nitrogen' || name === 'nitro') hits.push(relative(root, full) + '/');
      walk(full);
      continue;
    }
    const rel = relative(root, full);
    if (name === 'nitro.json' || name.endsWith('.nitro.ts')) hits.push(rel);
    if (/\.(json|ts|tsx|js|mjs|gradle|kt|cmake|txt)$/.test(name)) {
      const text = readFileSync(full, 'utf8');
      if (/react-native-nitro-modules|\bnitrogen\b/.test(text)) hits.push(rel);
    }
  }
}

walk(join(root, 'packages'));
walk(join(root, 'example'));

const unique = [...new Set(hits)].sort();
console.log(`Nitro/Nitrogen runtime audit: ${unique.length} remaining path(s)`);
for (const hit of unique) console.log(` - ${hit}`);

if (strict && unique.length) {
  console.error('\nStrict audit failed: remove the remaining Nitro/Nitrogen runtime paths.');
  process.exit(1);
}
