#!/usr/bin/env node
// Exercise the actual packed packages in an app outside this monorepo.
// Nothing in the consumer can resolve a workspace source file or a root
// devDependency. --assemble also builds the APK using the consumer's Gradle.
//
// node scripts/smoke-release-consumer.mjs --releases /tmp/releases [--assemble]
// Add --package-manager pnpm to exercise isolated node_modules resolution.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} needs a value`);
  return value;
}

const releasesArg = option('--releases');
if (!releasesArg) throw new Error('Pass --releases with the build-release-branches.mjs output.');
const releases = resolve(releasesArg);
const packageManager = option('--package-manager', 'npm');
assert(['npm', 'pnpm'].includes(packageManager), 'Supported package managers: npm, pnpm');
const projectArg = option('--project');
const project = projectArg
  ? resolve(projectArg)
  : mkdtempSync(join(tmpdir(), 'expo-pico-consumer-'));
if (existsSync(project) && readdirSync(project).length > 0) {
  throw new Error(`The consumer directory must be empty: ${project}`);
}
mkdirSync(project, { recursive: true });
const packs = mkdtempSync(join(tmpdir(), 'expo-pico-consumer-packs-'));
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const exec = (command, commandArgs, cwd = project, overrides = {}) =>
  execFileSync(command, commandArgs, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1', ...overrides },
  });

const templateDir = join(releases, 'template');
const template = readJson(join(templateDir, 'package.json'));
for (const command of ['start', 'android', 'android:pico', 'prebuild', 'doctor']) {
  assert(template.scripts?.[command], `The released template lost its ${command} script`);
}
assert(template.devDependencies?.['@babel/core'], 'The released template lost Babel');
assert(template.devDependencies?.typescript, 'The released template lost TypeScript');
assert(!template.scripts.prepare, 'The released template must not run a library prepare hook');

for (const entry of readdirSync(templateDir)) {
  if (entry !== 'package.json')
    cpSync(join(templateDir, entry), join(project, entry), { recursive: true });
}

const packages = [
  ['core', '@expo-pico/core'],
  ['account', '@expo-pico/account'],
  ['iap', '@expo-pico/iap'],
  ['platform-service-common', '@expo-pico/platform-service-common'],
  ['horizon-core', 'expo-horizon-core'],
];
const dependencies = { ...template.dependencies };
for (const [directory, name] of packages) {
  const packageDir = join(releases, directory);
  const manifest = readJson(join(packageDir, 'package.json'));
  assert.equal(manifest.name, name);
  assert(!manifest.scripts, `${name} must not require install-time compilation`);
  const report = JSON.parse(
    execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', packs], {
      cwd: packageDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    })
  );
  const [{ filename }] = Array.isArray(report) ? report : Object.values(report);
  dependencies[name] = `file:${join(packs, filename)}`;
}

writeFileSync(
  join(project, 'package.json'),
  JSON.stringify(
    {
      name: 'expo-pico-release-consumer',
      version: '1.0.0',
      private: true,
      main: template.main,
      scripts: template.scripts,
      dependencies,
      devDependencies: template.devDependencies,
    },
    null,
    2
  ) + '\n'
);

// This is a normal RN panel, the direct Horizon Core comparison. Viro's
// immersive renderer has its own artifact contract and is not required here.
// Keep app.config.ts so the shipped doctor must load a real dynamic config.
writeFileSync(
  join(project, 'app.config.ts'),
  `export default {
  name: 'PICO release consumer',
  slug: 'pico-release-consumer',
  orientation: 'default',
  newArchEnabled: true,
  android: { package: 'com.expopico.consumer' },
  plugins: [
    ['expo-horizon-core', { supportedDevices: 'quest2|quest3|quest3s' }],
    ['@expo-pico/core', { xrMode: 'pico-os5', appType: '2d', buildVariant: 'pico' }],
    ['@expo-pico/iap', {}],
  ],
};
`
);
if (packageManager === 'pnpm') {
  writeFileSync(join(project, '.npmrc'), 'node-linker=isolated\nhoist=false\n');
  exec('pnpm', ['install', '--ignore-scripts', '--no-frozen-lockfile']);
} else {
  exec('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund']);
}

const requireFromApp = createRequire(join(project, 'package.json'));
for (const [, name] of packages) {
  const manifestPath = requireFromApp.resolve(`${name}/package.json`);
  assert(manifestPath.startsWith(project + '/'), `${name} resolved outside the consumer app`);
  const manifest = readJson(manifestPath);
  if (name === '@expo-pico/platform-service-common' || name === '@expo-pico/account') continue;
  const requireFromPackage = createRequire(manifestPath);
  assert(
    manifest.dependencies?.['@expo/config-plugins'],
    `${name} does not declare its config-plugin runtime`
  );
  requireFromPackage('@expo/config-plugins');
  requireFromPackage('./app.plugin.js');
}

const localBin = (name) => join(project, 'node_modules', '.bin', name);
exec(localBin('expo-pico-doctor'), ['--json']);

// A clean rebuild must regenerate native configuration without a local AAR,
// a preserved android/ directory, or a second manual setup pass.
for (let pass = 1; pass <= 2; pass++) {
  exec(localBin('expo'), ['prebuild', '--clean', '--platform', 'android', '--no-install']);
  const appGradle = readFileSync(join(project, 'android', 'app', 'build.gradle'), 'utf8');
  assert.equal(
    (
      appGradle.match(
        /\/\/ expo-pico-core: PICO Platform Service SDK \(com\.pico\.pps:\*\) deps/g
      ) ?? []
    ).length,
    1
  );
  assert(
    appGradle.includes('picoImplementation "com.pico.pps:platform-service-auth:'),
    'PICO auth is not automatically resolved from Maven'
  );
  const libs = join(project, 'android', 'app', 'libs');
  assert(
    !existsSync(libs) || !readdirSync(libs).some((name) => name.endsWith('.aar')),
    'The build must not depend on manually copied app/libs AARs'
  );
  console.log(`Clean prebuild ${pass}: PICO dependencies regenerated without AAR provisioning.`);
}
exec(localBin('expo-pico-doctor'), ['--json']);

// A successful native debug build still needs a working Metro bundle. This
// catches template presets and JS dependencies hidden by monorepo hoisting.
exec(localBin('expo'), [
  'export',
  '--platform',
  'android',
  '--output-dir',
  '.consumer-export',
  '--max-workers',
  '2',
]);

if (args.includes('--assemble')) {
  // The CI consumer job is a fresh runner: no eskiuc installation and no
  // monorepo native artifacts. Gradle must link the released native runtime.
  exec(
    './gradlew',
    [':app:assemblePicoDebug', '-PreactNativeArchitectures=arm64-v8a', '--no-daemon'],
    join(project, 'android'),
    { ESKIUC: '' }
  );
  assert(
    existsSync(
      join(
        project,
        'android',
        'app',
        'build',
        'outputs',
        'apk',
        'pico',
        'debug',
        'app-pico-debug.apk'
      )
    )
  );
}
console.log(`Release consumer verified (${packageManager}): ${project}`);
