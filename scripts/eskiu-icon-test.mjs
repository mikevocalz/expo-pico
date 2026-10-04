#!/usr/bin/env node
/**
 * Host tests for the Eskiu icon mesher.
 *
 *   node scripts/eskiu-icon-test.mjs [--out dir] [--all-icons lucide-icons.json]
 *
 * 1. Compiles packages/internal/pico-eskiu-runtime/src/runtime.esk for the host
 *    and, with the flags ExpoPicoEskiu.cmake uses, for aarch64-linux-android.
 * 2. Builds test/icon_test.c against the host object and runs it on the curated
 *    Lucide icons (and, with --all-icons, sweeps every icon in that JSON file,
 *    as written by `node scripts/build-lucide-icons.mjs --all`).
 * 3. Rasterises each curated icon's mesh to <out>/png/<name>.png (white strokes
 *    on black) so the geometry can be checked by eye.
 *
 * Needs eskiuc >= 0.9.3 (ESKIUC or PATH) and a C compiler (CC or cc).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUNTIME = join(ROOT, 'packages/internal/pico-eskiu-runtime');
const CURATED_TS = join(ROOT, 'packages/expo-pico-core/src/icons/lucideIcons.generated.ts');

function parseArgs(argv) {
  const args = { out: join(tmpdir(), 'expo-pico-eskiu-icon-test'), allIcons: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = resolve(argv[++i]);
    else if (argv[i] === '--all-icons') args.allIcons = resolve(argv[++i]);
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return args;
}

function run(cmd, args) {
  console.log(`$ ${[cmd, ...args].join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit' });
}

/**
 * Reads the committed curated table without a TypeScript toolchain: the
 * LUCIDE_ICONS initialiser is a plain object literal, so it is evaluated as JS.
 * Works whatever layout prettier gives the file.
 */
function curatedIcons() {
  const src = readFileSync(CURATED_TS, 'utf8');
  const m = src.match(/export const LUCIDE_ICONS = (\{[\s\S]*?\n\}) as const;/);
  if (!m) throw new Error(`no LUCIDE_ICONS object literal in ${CURATED_TS}`);
  const icons = new Function(`return (${m[1]});`)();
  if (Object.keys(icons).length === 0) throw new Error(`LUCIDE_ICONS in ${CURATED_TS} is empty`);
  return icons;
}

function writeTsv(path, icons) {
  writeFileSync(
    path,
    Object.entries(icons)
      .map(([name, markup]) => `${name}\t${markup.replace(/[\t\n]/g, ' ')}`)
      .join('\n') + '\n'
  );
}

// --- PNG rasteriser -----------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(gray, size) {
  const raw = Buffer.alloc((size + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size + 1)] = 0;
    for (let x = 0; x < size; x++) raw[y * (size + 1) + 1 + x] = gray[y * size + x];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Rasterises a 24-unit mesh at `size` px with 4x4 supersampling. */
export function rasterise(vertices, indices, size = 256) {
  const ss = 4;
  const n = size * ss;
  const scale = n / 24;
  const cover = new Uint8Array(n * n);
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const p = [indices[t], indices[t + 1], indices[t + 2]].map((i) => [
      vertices[i * 2] * scale,
      vertices[i * 2 + 1] * scale,
    ]);
    const minX = Math.max(0, Math.floor(Math.min(p[0][0], p[1][0], p[2][0])));
    const maxX = Math.min(n - 1, Math.ceil(Math.max(p[0][0], p[1][0], p[2][0])));
    const minY = Math.max(0, Math.floor(Math.min(p[0][1], p[1][1], p[2][1])));
    const maxY = Math.min(n - 1, Math.ceil(Math.max(p[0][1], p[1][1], p[2][1])));
    const edge = (a, b, x, y) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const e0 = edge(p[0], p[1], px, py);
        const e1 = edge(p[1], p[2], px, py);
        const e2 = edge(p[2], p[0], px, py);
        if ((e0 >= 0 && e1 >= 0 && e2 >= 0) || (e0 <= 0 && e1 <= 0 && e2 <= 0)) {
          cover[y * n + x] = 1;
        }
      }
    }
  }
  const gray = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) sum += cover[(y * ss + sy) * n + x * ss + sx];
      }
      gray[y * size + x] = Math.round((sum * 255) / (ss * ss));
    }
  }
  return encodePng(gray, size);
}

// --- main -----------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  const eskiuc = process.env.ESKIUC || 'eskiuc';
  const cc = process.env.CC || 'cc';
  const build = join(args.out, 'build');
  const meshes = join(args.out, 'meshes');
  const pngs = join(args.out, 'png');
  for (const d of [build, meshes, pngs]) mkdirSync(d, { recursive: true });

  run(eskiuc, ['--version']);
  const source = join(RUNTIME, 'src/runtime.esk');
  const hostObj = join(build, 'runtime-host.o');
  const androidObj = join(build, 'runtime-aarch64-linux-android.o');
  run(eskiuc, [source, '-c', '-O2', '-o', hostObj]);
  // Same flags as cmake/ExpoPicoEskiu.cmake.
  run(eskiuc, [
    source,
    '--target',
    'aarch64-linux-android',
    '--reloc',
    'pic',
    '--freestanding',
    '-O2',
    '-o',
    androidObj,
  ]);
  const elf = readFileSync(androidObj);
  const isAarch64Elf =
    elf.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])) &&
    elf[4] === 2 && // 64-bit
    elf.readUInt16LE(18) === 183; // EM_AARCH64
  if (!isAarch64Elf) throw new Error(`${androidObj} is not an AArch64 ELF object`);
  console.log(`✓ ${androidObj}: ELF64 AArch64 relocatable, ${elf.length} bytes`);

  const testBin = join(build, 'icon_test');
  run(cc, [
    '-std=gnu11',
    '-O1',
    '-Wall',
    '-Werror',
    '-I',
    join(RUNTIME, 'include'),
    join(RUNTIME, 'test/icon_test.c'),
    hostObj,
    '-lm',
    '-o',
    testBin,
  ]);

  const curatedTsv = join(build, 'curated.tsv');
  writeTsv(curatedTsv, curatedIcons());
  const testArgs = [curatedTsv, meshes];
  if (args.allIcons) {
    const allTsv = join(build, 'all.tsv');
    writeTsv(allTsv, JSON.parse(readFileSync(args.allIcons, 'utf8')).icons);
    testArgs.push(allTsv);
  }
  run(testBin, testArgs);

  for (const file of readdirSync(meshes).filter((f) => f.endsWith('.json'))) {
    const { name, vertices, indices } = JSON.parse(readFileSync(join(meshes, file), 'utf8'));
    const out = join(pngs, `${name}.png`);
    writeFileSync(out, rasterise(vertices, indices));
    console.log(`  png: ${out}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
