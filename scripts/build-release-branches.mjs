#!/usr/bin/env node
// Stages every installable expo-pico package as a self-contained directory and,
// with --push, commits each one to its own `release/<short-name>` branch so
// consumers can install straight from GitHub:
//
//   "@expo-pico/core": "github:mikevocalz/expo-pico#release/core"
//
// The workflow in .github/workflows/release-branches.yml runs this with --push
// after `yarn build`. Run it without --push to inspect what would ship.
//
// Usage:
//   node scripts/build-release-branches.mjs [--out <dir>] [--push] [--remote origin]
//
// What each staged package gets:
//   - the exact `npm pack` contents (the package's `files` list, built output)
//   - @expo-pico/* `dependencies` moved to `peerDependencies` (pnpm 12 refuses
//     git subdependencies), except in the app template, where they point at
//     the matching release branch
//   - `scripts` and `devDependencies` removed, so nothing builds at install
//   - `gitHead` and `expoPico.sourceCommit` set to the source commit
//
// Short names: the @expo-pico/ scope is dropped (`@expo-pico/core` -> `core`,
// `@expo-pico/platform-service-common` -> `platform-service-common`), and
// `expo-horizon-core` -> `horizon-core`.

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const REPO_SLUG = 'mikevocalz/expo-pico';
const BRANCH_PREFIX = 'release/';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const push = flag('--push');
const remote = option('--remote', 'origin');
const outDir = resolve(option('--out', mkdtempSync(join(tmpdir(), 'expo-pico-release-'))));

function run(cmd, cmdArgs, opts = {}) {
  return execFileSync(cmd, cmdArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...opts,
  }).trim();
}
const git = (gitArgs, opts) => run('git', gitArgs, opts);
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

const sourceSha = git(['rev-parse', 'HEAD']);
const shortSha = sourceSha.slice(0, 7);

// A release commit says "from <sha>", so with --push the tracked files must be
// exactly that commit.
if (push && git(['status', '--porcelain', '--untracked-files=no'])) {
  throw new Error(
    'Refusing to push release branches from a working tree with uncommitted changes.'
  );
}

function shortName(pkgName) {
  if (pkgName === 'expo-horizon-core') return 'horizon-core';
  if (pkgName.startsWith('@expo-pico/')) return pkgName.slice('@expo-pico/'.length);
  throw new Error(`No short-name rule for ${pkgName}`);
}
// Packages whose manifest is copied into a new app rather than installed.
const APP_TEMPLATES = new Set(['@expo-pico/template']);
const releaseSpec = (pkgName) => `github:${REPO_SLUG}#${BRANCH_PREFIX}${shortName(pkgName)}`;

// ---------------------------------------------------------------------------
// 1. Collect workspace packages: every non-private one, plus any private one a
//    public package depends on (none today, but the rule keeps it honest).

const rootManifest = readJson(join(ROOT, 'package.json'));
const workspaces = rootManifest.workspaces
  .filter((dir) => dir.startsWith('packages/'))
  .map((dir) => ({ dir: join(ROOT, dir), manifest: readJson(join(ROOT, dir, 'package.json')) }));
const byName = new Map(workspaces.map((w) => [w.manifest.name, w]));

const selected = new Map();
const select = (w) => {
  if (selected.has(w.manifest.name)) return;
  selected.set(w.manifest.name, w);
  for (const dep of Object.keys(w.manifest.dependencies ?? {})) {
    if (byName.has(dep)) select(byName.get(dep));
  }
};
for (const w of workspaces) if (!w.manifest.private) select(w);

// ---------------------------------------------------------------------------
// 2. Pack and stage.

function packInto(packArgs, cwd, stageDir) {
  const scratch = mkdtempSync(join(tmpdir(), 'expo-pico-pack-'));
  // --ignore-scripts: the workflow already ran `yarn build`; npm must not run
  // prepare/prepack again outside the monorepo.
  const out = run(
    'npm',
    ['pack', ...packArgs, '--ignore-scripts', '--json', '--pack-destination', scratch],
    { cwd }
  );
  const [{ filename }] = JSON.parse(out);
  run('tar', ['xzf', join(scratch, filename), '-C', scratch]);
  rmSync(stageDir, { recursive: true, force: true });
  cpSync(join(scratch, 'package'), stageDir, { recursive: true });
  rmSync(scratch, { recursive: true, force: true });
}

function rewriteManifest(stageDir) {
  const file = join(stageDir, 'package.json');
  const m = readJson(file);
  const isInternal = (dep) => selected.has(dep) || dep === 'expo-horizon-core';
  for (const field of ['dependencies', 'optionalDependencies']) {
    for (const [dep, range] of Object.entries(m[field] ?? {})) {
      if (!isInternal(dep)) continue;
      if (APP_TEMPLATES.has(m.name)) {
        // A template's package.json becomes the app's root manifest, where a
        // git dependency is a direct dependency and installs fine.
        m[field][dep] = releaseSpec(dep);
      } else {
        // Inside a library, a git dependency is a git *sub*dependency, which
        // pnpm 12 rejects by default (ERR_PNPM_EXOTIC_SUBDEP, blockExoticSubdeps).
        // Ship it as a peer instead; the app lists it from its release branch.
        delete m[field][dep];
        m.peerDependencies = { ...(m.peerDependencies ?? {}), [dep]: range };
      }
    }
    if (m[field] && !Object.keys(m[field]).length) delete m[field];
  }
  // Peer ranges stay semver: a git-installed package still reports its
  // package.json version, so `>=1.0.0` is satisfied by release/core.
  delete m.scripts;
  delete m.devDependencies;
  m.gitHead = sourceSha;
  m.expoPico = { ...(m.expoPico ?? {}), sourceCommit: sourceSha };
  writeFileSync(file, JSON.stringify(m, null, 2) + '\n');
  return m;
}

function assertEntryPoints(stageDir, m) {
  const entries = [m.main, m.types].filter(Boolean);
  for (const target of Object.values(m.exports ?? {})) {
    if (typeof target === 'string') entries.push(target);
    else if (target) entries.push(...Object.values(target).filter((v) => typeof v === 'string'));
  }
  const missing = entries.filter((e) => !existsSync(join(stageDir, e)));
  if (missing.length) {
    throw new Error(
      `${m.name}: entry points missing from the packed output: ${missing.join(', ')}. ` +
        'Run `yarn build` first.'
    );
  }
}

mkdirSync(outDir, { recursive: true });
const staged = [];

for (const [name, w] of selected) {
  const stageDir = join(outDir, shortName(name));
  packInto([], w.dir, stageDir);

  // @expo-pico/core's CMakeLists includes the Eskiu runtime from
  // packages/internal, which does not exist outside the monorepo. Ship a copy
  // where CMakeLists.txt looks first.
  if (name === '@expo-pico/core') {
    const eskiu = join(ROOT, 'packages/internal/pico-eskiu-runtime');
    const dest = join(stageDir, 'android/eskiu-runtime');
    for (const part of ['cmake', 'include', 'src']) {
      cpSync(join(eskiu, part), join(dest, part), { recursive: true });
    }
  }

  const m = rewriteManifest(stageDir);
  assertEntryPoints(stageDir, m);
  staged.push({ name, version: m.version, stageDir });
}

// expo-horizon-core: the example app pins it; ship that exact upstream release
// (software-mansion-labs/expo-horizon) with the one patch this repo needs.
{
  const exampleManifest = readJson(join(ROOT, 'example/package.json'));
  const version = exampleManifest.dependencies?.['expo-horizon-core'];
  if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
    throw new Error(`example/package.json must pin expo-horizon-core exactly, got ${version}`);
  }
  const stageDir = join(outDir, shortName('expo-horizon-core'));
  packInto([`expo-horizon-core@${version}`], ROOT, stageDir);

  // AGP 9 stopped generating BuildConfig by default, and the module reads
  // BuildConfig.META_HORIZON_APP_ID. Same change as the local .vendor checkout.
  const gradleFile = join(stageDir, 'android/build.gradle');
  const gradle = readFileSync(gradleFile, 'utf8');
  if (!gradle.includes('buildConfig true')) {
    const patched = gradle.replace(
      /^android \{\n/m,
      'android {\n  // AGP 9 no longer generates BuildConfig by default; META_HORIZON_APP_ID needs it.\n' +
        '  buildFeatures {\n    buildConfig true\n  }\n'
    );
    if (patched === gradle) throw new Error('expo-horizon-core: android { anchor not found');
    writeFileSync(gradleFile, patched);
  }
  const m = rewriteManifest(stageDir);
  m.expoPico.upstream = `expo-horizon-core@${version}`;
  writeFileSync(join(stageDir, 'package.json'), JSON.stringify(m, null, 2) + '\n');
  assertEntryPoints(stageDir, m);
  staged.push({ name: 'expo-horizon-core', version: m.version, stageDir });
}

// ---------------------------------------------------------------------------
// 3. Commit each staged directory on top of its release branch.
//
// History stays linear: every release commit's parent is the previous tip of
// the same branch, so a consumer can pin any commit SHA and it stays reachable.
// A package whose contents did not change gets no new commit.

// Read the current tips straight from the remote and fetch their objects
// without writing any local ref (FETCH_HEAD only), so a dry run leaves the
// checkout's refs untouched. `--remote` accepts a remote name or a URL/path.
const remoteTips = new Map();
try {
  const listing = git(['ls-remote', '--heads', remote, `${BRANCH_PREFIX}*`]);
  for (const line of listing.split('\n').filter(Boolean)) {
    const [sha, ref] = line.split('\t');
    if (!ref.startsWith(`refs/heads/${BRANCH_PREFIX}`)) continue;
    remoteTips.set(ref.replace('refs/heads/', ''), sha);
  }
  if (remoteTips.size) {
    git([
      'fetch',
      '--quiet',
      '--no-tags',
      remote,
      ...[...remoteTips.keys()].map((b) => `refs/heads/${b}`),
    ]);
  }
} catch (error) {
  if (push) throw error;
  console.warn(`could not read ${remote}; comparing against empty branches (${error.message})`);
  remoteTips.clear();
}

const results = [];
for (const { name, version, stageDir } of staged) {
  const branch = BRANCH_PREFIX + shortName(name);
  const index = join(mkdtempSync(join(tmpdir(), 'expo-pico-index-')), 'index');
  const env = { ...process.env, GIT_INDEX_FILE: index };
  git(['--work-tree', stageDir, 'add', '--all', '--force', '.'], { env });
  const tree = git(['write-tree'], { env });

  const parent = remoteTips.get(branch) ?? '';
  const parentTree = parent ? git(['rev-parse', `${parent}^{tree}`]) : '';
  if (tree === parentTree) {
    results.push({ branch, name, version, status: 'unchanged', commit: parent });
    continue;
  }

  const message = `release ${name}@${version} from ${sourceSha}`;
  if (!push) {
    results.push({ branch, name, version, status: 'would commit', tree });
    continue;
  }
  const commit = git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', message]);
  // Plain push: fast-forward only. If someone rewrote the branch, fail loudly.
  git(['push', '--quiet', remote, `${commit}:refs/heads/${branch}`]);
  const tag = `${name}@${version}+${shortSha}`;
  // The same source commit can only produce different contents when an input
  // outside the repo moved (a re-run after a toolchain change). The branch
  // commit above still lands; the tag keeps pointing at the first one.
  if (git(['ls-remote', '--tags', remote, `refs/tags/${tag}`])) {
    console.warn(`tag ${tag} already exists on ${remote}; leaving it`);
    results.push({ branch, name, version, status: 'pushed', commit });
    continue;
  }
  // Annotated tag object built with mktag and pushed directly, so no local tag
  // ref is created.
  const tagObject = git(['mktag'], {
    input:
      `object ${commit}\ntype commit\ntag ${tag}\n` +
      `tagger ${git(['var', 'GIT_COMMITTER_IDENT'])}\n\n${message}\n`,
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  git(['push', '--quiet', remote, `${tagObject}:refs/tags/${tag}`]);
  results.push({ branch, name, version, status: 'pushed', commit, tag });
}

console.log(`source ${sourceSha}`);
console.log(`staged in ${outDir}`);
for (const r of results) {
  console.log(
    [
      r.branch.padEnd(36),
      `${r.name}@${r.version}`.padEnd(44),
      r.status,
      r.commit ?? '',
      r.tag ?? '',
    ]
      .join(' ')
      .trimEnd()
  );
}
console.log(
  `\n${readdirSync(outDir).length} packages staged${push ? '' : ' (dry run, nothing pushed)'}`
);
