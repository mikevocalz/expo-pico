// A consumer's CMake reads the release object without finding or running
// eskiuc. Fake producer fixtures exercise corruption checks; ESKIUC also enables
// the real compiler reproducibility check in release CI.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildEskiuRuntime,
  PREBUILT_DIRECTORY,
  OBJECT_FILENAME,
} from './lib/build-eskiu-runtime.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'packages/internal/pico-eskiu-runtime');
const VERSION = readFileSync(join(SOURCE, 'cmake/eskiu-version.txt'), 'utf8').trim();
const CMAKE =
  process.env.CMAKE ||
  spawnSync('sh', ['-c', 'command -v cmake'], { encoding: 'utf8' }).stdout.trim();
let work;
let runtime;
beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), 'eskiu-release-'));
  runtime = join(work, 'runtime');
  cpSync(SOURCE, runtime, { recursive: true });
});
afterEach(() => rmSync(work, { recursive: true, force: true }));

function fakeCompiler(version = VERSION, machine = 183) {
  const compiler = join(work, 'eskiuc');
  writeFileSync(
    compiler,
    `#!${process.execPath}\n` +
      `const fs = require('node:fs');\n` +
      `if (process.argv[2] === '--version') { console.log('Eskiu ${version} (test compiler)'); process.exit(0); }\n` +
      `fs.writeFileSync(${JSON.stringify(join(work, 'arguments.json'))}, JSON.stringify(process.argv.slice(2)));\n` +
      `const bytes = Buffer.alloc(64); Buffer.from('7f454c46020101','hex').copy(bytes);\n` +
      `bytes.writeUInt16LE(1, 16); bytes.writeUInt16LE(${machine}, 18);\n` +
      `fs.writeFileSync(process.argv[process.argv.indexOf('-o') + 1], bytes);\n`
  );
  chmodSync(compiler, 0o755);
  return compiler;
}

function produce() {
  return buildEskiuRuntime(runtime, { compiler: fakeCompiler(), sourceCommit: 'a'.repeat(40) });
}

function validate({ required = true } = {}) {
  assert(CMAKE, 'Install CMake to run the Eskiu release integrity tests');
  const script = join(work, 'validate.cmake');
  writeFileSync(
    script,
    'cmake_minimum_required(VERSION 3.22.1)\n' +
      `include("${join(runtime, 'cmake/ExpoPicoEskiu.cmake')}")\n` +
      `set(EXPO_PICO_ESKIU_REQUIRE_PREBUILT ${required ? 'TRUE' : 'FALSE'})\n` +
      `expo_pico_prebuilt_eskiu_object("${runtime}" object)\n` +
      'message(STATUS "OBJECT=${object}")\n'
  );
  const result = spawnSync(CMAKE, ['-P', script], {
    // Deliberately no compiler, including no pinned installation at HOME.
    env: {
      PATH: join(work, 'empty-path'),
      HOME: join(work, 'empty-home'),
      ESKIUC: join(work, 'missing-compiler'),
    },
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

function updateManifest(change) {
  const path = join(runtime, PREBUILT_DIRECTORY, 'manifest.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  change(manifest);
  writeFileSync(path, JSON.stringify(manifest));
}

test('release compilation pins the target, PIC flags, sources, and object checksum', () => {
  const { objectPath, manifest } = produce();
  assert.deepEqual(JSON.parse(readFileSync(join(work, 'arguments.json'))), [
    'src/runtime.esk',
    '--target',
    'aarch64-linux-android',
    '--reloc',
    'pic',
    '--freestanding',
    '-O2',
    '-o',
    `${PREBUILT_DIRECTORY}/${OBJECT_FILENAME}`,
  ]);
  assert.equal(manifest.compilerVersion, VERSION);
  assert.equal(
    manifest.objectSha256,
    createHash('sha256').update(readFileSync(objectPath)).digest('hex')
  );
  assert.deepEqual(
    manifest.sources.map(({ path }) => path),
    [
      'cmake/eskiu-version.txt',
      'include/expo_pico_eskiu.h',
      'src/icon/path.esk',
      'src/icon/stroke.esk',
      'src/icon/svg.esk',
      'src/runtime.esk',
    ]
  );
});

test('release production rejects a compiler version outside the pin', () => {
  assert.throws(
    () => buildEskiuRuntime(runtime, { compiler: fakeCompiler('0.0.1') }),
    /requires eskiuc/
  );
});

test('release production rejects a host-architecture object', () => {
  assert.throws(
    () => buildEskiuRuntime(runtime, { compiler: fakeCompiler(VERSION, 62) }),
    /ELF64 AArch64/
  );
});

test('CMake accepts packaged runtime with no compiler or shell on PATH', () => {
  const { objectPath } = produce();
  const result = validate();
  assert.equal(result.status, 0, result.output);
  assert(result.output.includes(`OBJECT=${objectPath}`), result.output);
});

test('a consumer target configures without Eskiu and revalidates changed inputs on build', () => {
  const { objectPath } = produce();
  const project = join(work, 'consumer');
  const build = join(work, 'build');
  mkdirSync(project);
  writeFileSync(join(project, 'probe.c'), 'int probe(void) { return 0; }\n');
  writeFileSync(
    join(project, 'CMakeLists.txt'),
    'cmake_minimum_required(VERSION 3.22.1)\nproject(consumer C)\n' +
      'add_library(consumer STATIC probe.c)\n' +
      'set(ANDROID TRUE)\nset(CMAKE_ANDROID_ARCH_ABI arm64-v8a)\n' +
      'set(EXPO_PICO_ESKIU_REQUIRE_PREBUILT TRUE)\n' +
      `include("${join(runtime, 'cmake/ExpoPicoEskiu.cmake')}")\n` +
      'expo_pico_add_eskiu_runtime(consumer)\n' +
      'get_target_property(sources consumer SOURCES)\n' +
      'get_target_property(definitions consumer COMPILE_DEFINITIONS)\n' +
      'file(WRITE "${CMAKE_BINARY_DIR}/selection.txt" "${sources}\\n${definitions}")\n'
  );
  const env = {
    PATH: '/usr/bin:/bin',
    HOME: join(work, 'empty-home'),
    ESKIUC: join(work, 'missing-compiler'),
  };
  const configured = spawnSync(CMAKE, ['-S', project, '-B', build, '-G', 'Unix Makefiles'], {
    env,
    encoding: 'utf8',
  });
  assert.equal(configured.status, 0, `${configured.stdout}${configured.stderr}`);
  const selected = readFileSync(join(build, 'selection.txt'), 'utf8');
  // CMake may retain the helper's /cmake/../ spelling in its source property.
  assert(selected.includes(OBJECT_FILENAME), selected);
  assert(selected.includes('EXPO_PICO_ESKIU=1'), selected);
  const bytes = readFileSync(objectPath);
  bytes[32] = 1;
  writeFileSync(objectPath, bytes);
  const rebuilt = spawnSync(CMAKE, ['--build', build], { env, encoding: 'utf8' });
  assert.notEqual(rebuilt.status, 0, `${rebuilt.stdout}${rebuilt.stderr}`);
  assert.match(`${rebuilt.stdout}${rebuilt.stderr}`, /object checksum mismatch/);
});

test('source checkouts retain the pinned-compiler build path', () => {
  const result = validate({ required: false });
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /OBJECT=\s*$/);
});

test('a release missing its entire prebuilt directory fails without asking for a compiler', () => {
  const result = validate();
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /runtime is incomplete/);
  assert.doesNotMatch(result.output, /install-eskiuc/);
});

for (const file of ['manifest.json', OBJECT_FILENAME]) {
  test(`a release missing ${file} is rejected`, () => {
    produce();
    rmSync(join(runtime, PREBUILT_DIRECTORY, file));
    const result = validate();
    assert.notEqual(result.status, 0, result.output);
    assert.match(result.output, /runtime is incomplete/);
  });
}

test('CMake rejects a changed object', () => {
  const { objectPath } = produce();
  const bytes = readFileSync(objectPath);
  bytes[32] = 1;
  writeFileSync(objectPath, bytes);
  const result = validate();
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /object checksum mismatch/);
});

test('CMake checks architecture even if the digest is updated', () => {
  const { objectPath } = produce();
  const bytes = readFileSync(objectPath);
  bytes.writeUInt16LE(62, 18);
  writeFileSync(objectPath, bytes);
  updateManifest((manifest) => {
    manifest.objectSha256 = createHash('sha256').update(bytes).digest('hex');
  });
  const result = validate();
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /not ELF64 AArch64/);
});

for (const [field, value] of [
  ['compilerVersion', '0.0.1'],
  ['abi', 'x86_64'],
  ['relocation', 'static'],
]) {
  test(`CMake rejects incompatible ${field} provenance`, () => {
    produce();
    updateManifest((manifest) => {
      manifest[field] = value;
    });
    const result = validate();
    assert.notEqual(result.status, 0, result.output);
    assert(result.output.includes(`invalid ${field}`), result.output);
  });
}

test('CMake rejects a stale object after source changes', () => {
  produce();
  writeFileSync(join(runtime, 'src/runtime.esk'), '// different source\n');
  const result = validate();
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /source checksum mismatch/);
});

test('CMake rejects an incomplete source inventory', () => {
  produce();
  mkdirSync(join(runtime, 'src/extra'), { recursive: true });
  writeFileSync(join(runtime, 'src/extra/new.esk'), '// new source\n');
  const result = validate();
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /source inventory mismatch/);
});

test(
  'the pinned real compiler produces identical consumer artifacts in different directories',
  {
    skip: !process.env.ESKIUC && 'Set ESKIUC to enable the real compiler check',
  },
  () => {
    const second = join(work, 'second/runtime');
    cpSync(SOURCE, second, { recursive: true });
    const a = buildEskiuRuntime(runtime, { compiler: process.env.ESKIUC });
    const b = buildEskiuRuntime(second, { compiler: process.env.ESKIUC });
    assert.deepEqual(readFileSync(a.objectPath), readFileSync(b.objectPath));
    assert.deepEqual(readFileSync(a.manifestPath), readFileSync(b.manifestPath));
    const result = validate();
    assert.equal(result.status, 0, result.output);
  }
);
