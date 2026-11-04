#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const strict = process.argv.includes('--strict');
// The version ExpoPicoEskiu.cmake accepts; scripts/install-eskiuc.sh installs it.
const VERSION_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../packages/internal/pico-eskiu-runtime/cmake/eskiu-version.txt'
);
const REQUIRED = readFileSync(VERSION_FILE, 'utf8').trim().split('.').map(Number);

function parseVersion(text) {
  const m = text.match(/(?:eskiu(?:c)?\s+)?v?(\d+)\.(\d+)\.(\d+)/i);
  return m ? m.slice(1).map(Number) : null;
}
function same(a, b) {
  return a.every((part, i) => part === b[i]);
}
try {
  const out = execFileSync(process.env.ESKIUC || 'eskiuc', ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const version = parseVersion(out);
  if (!version) throw new Error(`could not parse version from: ${out}`);
  if (!same(version, REQUIRED)) {
    throw new Error(`Eskiu ${version.join('.')} found; the build needs ${REQUIRED.join('.')}`);
  }
  console.log(`✓ eskiuc ${version.join('.')} — Expo PICO Eskiu toolchain ready`);
} catch (error) {
  const message =
    `Eskiu compiler not ready. Install Eskiu ${REQUIRED.join('.')} with scripts/install-eskiuc.sh ` +
    '(or set ESKIUC=/absolute/path/to/eskiuc).';
  if (strict) {
    console.error(`✗ ${message}\n${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  console.warn(`! ${message}`);
  console.warn('  arm64 Android builds of @expo-pico/core fail at configure without it.');
}
