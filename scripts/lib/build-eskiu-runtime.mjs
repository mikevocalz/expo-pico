// Release-time compilation only. Installed applications consume the checked
// object and never download or execute an Eskiu compiler.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, resolve } from 'node:path';

export const PREBUILT_DIRECTORY = 'prebuilt/android/arm64-v8a';
export const OBJECT_FILENAME = 'expo_pico_eskiu_runtime.o';
const TARGET = 'aarch64-linux-android';
const sha256 = (data) => createHash('sha256').update(data).digest('hex');

export function runtimeSourceFiles(runtimeDir) {
  const files = ['cmake/eskiu-version.txt'];
  function visit(directory, extension) {
    for (const entry of readdirSync(join(runtimeDir, directory), { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) visit(path, extension);
      else if (entry.isFile() && path.endsWith(extension)) files.push(path);
      else if (entry.isSymbolicLink())
        throw new Error(`Eskiu runtime input must not be a symlink: ${path}`);
    }
  }
  visit('src', '.esk');
  visit('include', '.h');
  if (!files.includes('src/runtime.esk'))
    throw new Error('Eskiu runtime is missing src/runtime.esk');
  return files.sort();
}

export function assertAndroidArm64Object(bytes) {
  if (
    bytes.length < 64 ||
    bytes.subarray(0, 7).toString('hex') !== '7f454c46020101' ||
    bytes.readUInt16LE(16) !== 1 ||
    bytes.readUInt16LE(18) !== 183
  ) {
    throw new Error(
      'Eskiu compiler did not produce a little-endian ELF64 AArch64 relocatable object'
    );
  }
}

export function buildEskiuRuntime(runtimeDir, { compiler, sourceCommit } = {}) {
  runtimeDir = resolve(runtimeDir);
  const version = readFileSync(join(runtimeDir, 'cmake/eskiu-version.txt'), 'utf8').trim();
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid pinned Eskiu version: ${version}`);
  const installed = join(homedir(), `.local/eskiu-${version}/bin/eskiuc`);
  compiler ??= process.env.ESKIUC || (existsSync(installed) ? installed : 'eskiuc');
  let compilerDescription;
  try {
    compilerDescription = execFileSync(compiler, ['--version'], { encoding: 'utf8' }).trim();
  } catch (error) {
    throw new Error(
      `Release packaging needs eskiuc ${version}. Run scripts/install-eskiuc.sh or set ESKIUC to that compiler.`,
      { cause: error }
    );
  }
  if (compilerDescription.match(/\bEskiu (\d+\.\d+\.\d+)\b/)?.[1] !== version) {
    throw new Error(`Release packaging requires eskiuc ${version}; found ${compilerDescription}`);
  }

  const destination = join(runtimeDir, PREBUILT_DIRECTORY);
  mkdirSync(destination, { recursive: true });
  const objectPath = join(destination, OBJECT_FILENAME);
  const manifestPath = join(destination, 'manifest.json');
  // A failed rebuild must never leave an old object looking publishable.
  rmSync(objectPath, { force: true });
  rmSync(manifestPath, { force: true });
  const output = relative(runtimeDir, objectPath).split('\\').join('/');
  const args = [
    'src/runtime.esk',
    '--target',
    TARGET,
    '--reloc',
    'pic',
    '--freestanding',
    '-O2',
    '-o',
    output,
  ];
  execFileSync(compiler, args, { cwd: runtimeDir, stdio: ['ignore', 'pipe', 'inherit'] });
  const bytes = readFileSync(objectPath);
  assertAndroidArm64Object(bytes);
  const manifest = {
    schemaVersion: 1,
    compilerVersion: version,
    compilerDescription,
    target: TARGET,
    abi: 'arm64-v8a',
    relocation: 'pic',
    freestanding: true,
    optimization: 'O2',
    ...(sourceCommit ? { sourceCommit } : {}),
    objectFilename: OBJECT_FILENAME,
    objectSha256: sha256(bytes),
    sources: runtimeSourceFiles(runtimeDir).map((path) => ({
      path,
      sha256: sha256(readFileSync(join(runtimeDir, path))),
    })),
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  // If a package is damaged, CMake must report it rather than ask its user to
  // install a compiler. Only source checkouts may use the compiler fallback.
  writeFileSync(
    join(runtimeDir, 'prebuilt/required'),
    'Release packages require the validated prebuilt runtime.\n'
  );
  return { objectPath, manifestPath, manifest };
}
