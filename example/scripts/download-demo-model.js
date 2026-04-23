#!/usr/bin/env node
/**
 * expo-pico example — demo glTF model bootstrap.
 *
 * Downloads a small, permissively-licensed glTF 2.0 binary from the
 * Khronos sample assets repo into `example/assets/models/pico-demo.glb`
 * so the scene's `GltfModel.tsx` loads a real rigged + animated model
 * instead of its procedural torus-knot fallback.
 *
 * Chosen sample: BrainStem (CC0 / public domain). Small (~3 MB) and
 * carries three built-in skeletal animation clips, which exercises the
 * `three` / `@react-three/fiber/native` animation-mixer path end-to-end.
 *
 * Contract:
 *   - Uses only Node stdlib (https, fs, path, url). No new deps.
 *   - Idempotent: no-op if the target file already exists (unless
 *     `--force`).
 *   - Skippable: `EXPO_PICO_SKIP_DEMO_MODEL=1` exits 0 without fetching.
 *     Set this in CI, on restricted networks, or when shipping a
 *     different GLB manually.
 *   - Postinstall tolerance: when invoked with `--post-install`, any
 *     network failure prints a warning and exits 0 so `yarn install`
 *     never fails because of a flaky connection.
 *   - Manual-mode strictness: without `--post-install`, a failed
 *     download exits 1 so CI can enforce model presence when wanted.
 *
 * The downloaded file is intentionally listed in `.gitignore` — the
 * binary shouldn't land in the repo history; every checkout regenerates
 * it.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

// ── Configuration ────────────────────────────────────────────────────

// Pinned to a stable commit so a Khronos repo restructure doesn't
// silently break the download. Update this SHA when rotating the sample.
// The model and its license are unchanged across Khronos refactors —
// BrainStem has been CC0 since it was first added in 2018.
const SOURCE_URL =
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/d7a3cc8e51d7c573771ae77a57f16b0662a905c6/2.0/BrainStem/glTF-Binary/BrainStem.glb';

// Relative to this script (example/scripts/…) so the resolution stays
// correct whether invoked from the example dir, the monorepo root, or
// via yarn workspace scripts.
const TARGET_PATH = path.resolve(
  __dirname,
  '..',
  'assets',
  'models',
  'pico-demo.glb'
);

// GitHub raw content serves up to ~10 redirects normally; cap defensively.
const MAX_REDIRECTS = 6;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_BYTES = 16 * 1024 * 1024; // 16 MB — BrainStem.glb is ~3 MB; cap well below anything the user would want.

// ── CLI args ─────────────────────────────────────────────────────────

const args = new Set(process.argv.slice(2));
const isPostInstall = args.has('--post-install');
const isForce = args.has('--force');
const isVerbose = args.has('--verbose') || process.env.EXPO_PICO_DEMO_MODEL_VERBOSE === '1';

// ── Helpers ──────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`[expo-pico demo-model] ${msg}\n`);
}

function warn(msg) {
  process.stderr.write(`[expo-pico demo-model] ${msg}\n`);
}

/**
 * `failOrWarn(msg)` exits 0 with a warning when invoked as a postinstall
 * step, or exits 1 otherwise. Ensures `yarn install` never fails because
 * the Khronos CDN is flaky, while still giving manual/CI runs a useful
 * non-zero exit code.
 */
function failOrWarn(msg) {
  if (isPostInstall) {
    warn(msg);
    warn('Continuing — the example scene will use its procedural fallback.');
    warn('Run `yarn demo:model` manually later to try again.');
    process.exit(0);
  }
  warn(msg);
  process.exit(1);
}

/**
 * GET a URL, following redirects, into a Buffer. Node stdlib only —
 * stays in sync with the promise-returning contract the caller expects.
 */
function fetchBinary(url, redirectsLeft = MAX_REDIRECTS) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err, value) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(value);
    };

    const req = https.get(new URL(url), { timeout: REQUEST_TIMEOUT_MS }, (res) => {
      const { statusCode, headers } = res;

      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume();
        if (redirectsLeft <= 0) {
          return done(new Error(`too many redirects (started at ${url})`));
        }
        const next = new URL(headers.location, url).toString();
        if (isVerbose) log(`redirect ${statusCode} → ${next}`);
        fetchBinary(next, redirectsLeft - 1).then(resolve, reject);
        return;
      }

      if (statusCode !== 200) {
        res.resume();
        return done(new Error(`HTTP ${statusCode} for ${url}`));
      }

      const chunks = [];
      let total = 0;
      res.on('data', (chunk) => {
        total += chunk.length;
        if (total > MAX_BYTES) {
          req.destroy(new Error(`response exceeded ${MAX_BYTES} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => done(null, Buffer.concat(chunks)));
      res.on('error', (err) => done(err));
    });

    req.on('timeout', () => req.destroy(new Error(`timeout after ${REQUEST_TIMEOUT_MS}ms`)));
    req.on('error', (err) => done(err));
  });
}

/**
 * Quick sanity check on the fetched bytes. glTF-Binary files start
 * with the 4-byte magic `glTF` (0x46546C67 little-endian). If the
 * header is wrong we discard the fetch rather than write a misnamed
 * file that the loader would fail on silently.
 */
function looksLikeGlb(buf) {
  return (
    buf.length >= 12 &&
    buf[0] === 0x67 && // 'g'
    buf[1] === 0x6c && // 'l'
    buf[2] === 0x54 && // 'T'
    buf[3] === 0x46 // 'F'
  );
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  if (process.env.EXPO_PICO_SKIP_DEMO_MODEL === '1') {
    log('EXPO_PICO_SKIP_DEMO_MODEL=1 — skipping demo-model download.');
    return;
  }

  if (fs.existsSync(TARGET_PATH) && !isForce) {
    if (isVerbose) {
      log(`demo model already present at ${path.relative(process.cwd(), TARGET_PATH)}`);
    }
    return;
  }

  log(`fetching ${SOURCE_URL}`);
  log('  (CC0, Khronos glTF sample — BrainStem)');

  let buf;
  try {
    buf = await fetchBinary(SOURCE_URL);
  } catch (err) {
    return failOrWarn(`download failed: ${err.message}`);
  }

  if (!looksLikeGlb(buf)) {
    return failOrWarn(
      `fetched bytes do not look like a glTF-Binary file (got ${buf.length} bytes, wrong magic). ` +
        `The Khronos URL may have changed — pin a newer commit SHA in download-demo-model.js.`
    );
  }

  fs.mkdirSync(path.dirname(TARGET_PATH), { recursive: true });
  fs.writeFileSync(TARGET_PATH, buf);
  log(
    `wrote ${buf.length.toLocaleString()} bytes to ${path.relative(process.cwd(), TARGET_PATH)}`
  );
}

main().catch((err) => failOrWarn(`unexpected error: ${err.message}`));
