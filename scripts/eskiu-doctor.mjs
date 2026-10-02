#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const strict = process.argv.includes('--strict');
const REQUIRED = [0, 9, 2];

function parseVersion(text) {
  const m = text.match(/(?:eskiu(?:c)?\s+)?v?(\d+)\.(\d+)\.(\d+)/i);
  return m ? m.slice(1).map(Number) : null;
}
function gte(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}
try {
  const out = execFileSync(process.env.ESKIUC || 'eskiuc', ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const version = parseVersion(out);
  if (!version) throw new Error(`could not parse version from: ${out}`);
  if (!gte(version, REQUIRED)) {
    throw new Error(`Eskiu ${version.join('.')} found; >= ${REQUIRED.join('.')} required`);
  }
  console.log(`✓ eskiuc ${version.join('.')} — Expo PICO Eskiu toolchain ready`);
} catch (error) {
  const message =
    'Eskiu compiler not ready. Install Eskiu >= 0.9.2 and ensure `eskiuc` is on PATH ' +
    '(or set ESKIUC=/absolute/path/to/eskiuc).';
  if (strict) {
    console.error(`✗ ${message}\n${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  console.warn(`! ${message}`);
  console.warn('  Non-PICO/mobile builds can continue without Eskiu.');
}
