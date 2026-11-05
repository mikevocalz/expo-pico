// Rules for what an installable expo-pico package may and must carry.
//
// These packages install from GitHub (release branches, see
// docs/INSTALL-FROM-GITHUB.md), and a git install packs the package with its
// `files` list exactly like `npm pack` does. Whatever `files` lets through
// lands in every consuming app's node_modules.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

// Paths that belong to an app or a developer checkout, never to a library.
export const FORBIDDEN = [
  { re: /^android\/app\//, why: 'an Android app module' },
  { re: /\.(keystore|jks)$/, why: 'a signing keystore' },
  { re: /(^|\/)gradle\/wrapper\//, why: 'the Gradle wrapper' },
  { re: /(^|\/)gradlew(\.bat)?$/, why: 'the Gradle wrapper script' },
  { re: /^android\/settings\.gradle(\.kts)?$/, why: 'a Gradle root-project settings file' },
  { re: /^android\/(gradle|local)\.properties$/, why: 'root-project Gradle properties' },
  { re: /^android\/(build|\.cxx|\.gradle)\//, why: 'Gradle/CMake build output' },
  { re: /^example\//, why: 'an example app' },
  { re: /(^|\/)(AGENTS|CLAUDE)\.md$/, why: 'an agent instruction file' },
];

export function forbiddenPaths(paths) {
  const hits = [];
  for (const path of paths) {
    const rule = FORBIDDEN.find(({ re }) => re.test(path));
    if (rule) hits.push(`${path} (${rule.why})`);
  }
  return hits;
}

// Static approximation of npm's packlist: tracked files under any `files`
// entry. The entries in this repo are plain paths, no globs or negations.
export function selectedByFiles(tracked, files) {
  const entries = (files ?? []).map((f) => f.replace(/\/+$/, ''));
  return tracked.filter((path) => entries.some((e) => path === e || path.startsWith(`${e}/`)));
}

// Files the Android library build reads: the module's build.gradle and
// CMakeLists.txt, its sources, the Expo module dir, and any extra
// android/*.gradle script the config plugin applies from the app (core's
// one-launcher-tile.gradle and pico-window-positions.gradle). Everything is
// taken from git so a missing entry in `files` shows up here.
export function requiredFiles(tracked) {
  return tracked.filter(
    (path) =>
      path === 'android/build.gradle' ||
      path === 'android/CMakeLists.txt' ||
      path.startsWith('android/src/') ||
      path.startsWith('android-expo/') ||
      (/^android\/[^/]+\.gradle$/.test(path) && !FORBIDDEN.some(({ re }) => re.test(path)))
  );
}

// Generated files the library build loads (`apply from: '../nitrogen/...'`,
// `include(.../../nitrogen/...)`). They exist only after `yarn build`, so
// they are required only when present on disk.
export function referencedGeneratedFiles(pkgDir) {
  const found = [];
  const scan = (file, re) => {
    const abs = join(pkgDir, file);
    if (!existsSync(abs)) return;
    for (const m of readFileSync(abs, 'utf8').matchAll(re)) {
      const rel = posix.normalize(posix.join('android', m[1]));
      if (!rel.startsWith('android/') && existsSync(join(pkgDir, rel))) found.push(rel);
    }
  };
  scan('android/build.gradle', /apply from:\s*['"](\.\.\/[^'"]+)['"]/g);
  scan('android/CMakeLists.txt', /include\(\$\{CMAKE_CURRENT_SOURCE_DIR\}\/(\.\.\/[^)]+)\)/g);
  return found;
}

export function trackedFiles(pkgDir) {
  return execFileSync('git', ['ls-files', '-z', '--', '.'], { cwd: pkgDir, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

export function missingPaths(packed, required) {
  const set = new Set(packed);
  return required.filter((path) => !set.has(path));
}

// `npm pack --json` prints an array on npm 10 and an object keyed by package
// name on npm 11+. npm 10 can also print `prepare` output ahead of the JSON.
// That output can itself start a line with `[` (`[nitrogen] ...`), so try
// each line that opens with `[` or `{` until one parses to the end.
export function packedPathsFromJson(stdout) {
  for (const m of stdout.matchAll(/^[[{]/gm)) {
    let parsed;
    try {
      parsed = JSON.parse(stdout.slice(m.index));
    } catch {
      continue;
    }
    const [report] = Array.isArray(parsed) ? parsed : Object.values(parsed);
    return report.files.map((f) => f.path);
  }
  throw new Error(`no JSON in npm pack output:\n${stdout.slice(0, 500)}`);
}
