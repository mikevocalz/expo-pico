import { AndroidConfig } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * One launcher tile per app.
 *
 * PICO OS and Horizon OS list every activity whose intent-filter pairs
 * `android.intent.action.MAIN` with one of LAUNCHER_VISIBLE_CATEGORIES. This
 * plugin used to give Viro's `.VRActivity` MAIN plus the PICO/OpenXR
 * categories, so a PICO 4 Ultra showed the app twice. VRActivity is started
 * by an explicit intent and PICO runs it immersive with no intent-filter at
 * all (checked on a PICO 4 Ultra, OS 5.15.7), so it needs none.
 *
 * The rule: exactly one activity in an app may be launcher-visible.
 */

export const MAIN_ACTION = 'android.intent.action.MAIN';

/** Categories that put a MAIN activity in a phone or headset app library. */
export const LAUNCHER_VISIBLE_CATEGORIES: readonly string[] = [
  'android.intent.category.LAUNCHER',
  'com.oculus.intent.category.VR',
  'com.pico.intent.category.VR',
  'com.picovr.intent.category.VR',
  'org.khronos.openxr.intent.category.IMMERSIVE_HMD',
];

type Node = { $?: Record<string, string | undefined>; [key: string]: any };
type Manifest = AndroidConfig.Manifest.AndroidManifest;

const nameOf = (node: Node | undefined) => node?.$?.['android:name'];

/** True when `filter` lists MAIN and at least one launcher-visible category. */
export function isLauncherVisibleFilter(filter: Node): boolean {
  const actions: Node[] = filter.action ?? [];
  const categories: Node[] = filter.category ?? [];
  return (
    actions.some((a) => nameOf(a) === MAIN_ACTION) &&
    categories.some((c) => LAUNCHER_VISIBLE_CATEGORIES.includes(nameOf(c) ?? ''))
  );
}

function activitiesOf(manifest: Manifest): Node[] {
  const app = (manifest.manifest.application?.[0] ?? {}) as Node;
  return [...((app.activity ?? []) as Node[]), ...((app['activity-alias'] ?? []) as Node[])];
}

/**
 * Launcher-visible activity names for the main manifest merged with one
 * flavor manifest. Approximates the manifest merger: an activity counts when
 * either file gives it a launcher-visible filter, unless the flavor removes
 * the activity, replaces it, or drops its filters with
 * `<intent-filter tools:node="removeAll"/>`.
 */
export function launcherVisibleActivities(main: Manifest, flavor?: Manifest): string[] {
  const names = new Set<string>();
  for (const activity of activitiesOf(main)) {
    const filters: Node[] = activity['intent-filter'] ?? [];
    if (filters.some(isLauncherVisibleFilter)) names.add(nameOf(activity) ?? '(unnamed)');
  }
  if (!flavor) return [...names];
  for (const activity of activitiesOf(flavor)) {
    const name = nameOf(activity);
    if (!name) continue;
    const node = activity.$?.['tools:node'];
    const filters: Node[] = activity['intent-filter'] ?? [];
    if (node === 'remove' || node === 'removeAll') {
      names.delete(name);
      continue;
    }
    if (node === 'replace' || filters.some((f) => f.$?.['tools:node'] === 'removeAll')) {
      names.delete(name);
    }
    if (filters.some(isLauncherVisibleFilter)) names.add(name);
  }
  return [...names];
}

export function launcherTileError(where: string, names: string[]): Error {
  return new Error(
    `[one-launcher-tile] ${where} declares ${names.length} launcher-visible activities ` +
      `(${names.join(', ')}). PICO OS and Horizon OS show one app-library tile per ` +
      `activity whose intent-filter pairs ${MAIN_ACTION} with one of ` +
      `${LAUNCHER_VISIBLE_CATEGORIES.join(', ')}. Exactly one activity may do that. ` +
      `Start immersive activities with an explicit intent and give their headset ` +
      `categories a non-MAIN action such as com.viro.intent.action.VR.`
  );
}

/** Throws when `main` (optionally merged with `flavor`) has more than one tile. */
export function assertAtMostOneLauncherTile(
  where: string,
  main: Manifest,
  flavor?: Manifest
): void {
  const names = launcherVisibleActivities(main, flavor);
  if (names.length > 1) throw launcherTileError(where, names);
}

/**
 * Reads app/src/main and every app/src/<flavor> manifest on disk and throws
 * when main alone, or main plus any one flavor, has more than one
 * launcher-visible activity. Library manifests are checked by the Gradle
 * task in android/one-launcher-tile.gradle, which reads the merged result.
 */
export async function assertOneLauncherTileOnDisk(platformProjectRoot: string): Promise<void> {
  const srcDir = path.join(platformProjectRoot, 'app', 'src');
  const mainPath = path.join(srcDir, 'main', 'AndroidManifest.xml');
  if (!fs.existsSync(mainPath)) return;
  const main = await AndroidConfig.Manifest.readAndroidManifestAsync(mainPath);
  assertAtMostOneLauncherTile('app/src/main/AndroidManifest.xml', main);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'main') continue;
    const flavorPath = path.join(srcDir, entry.name, 'AndroidManifest.xml');
    if (!fs.existsSync(flavorPath)) continue;
    const flavor = await AndroidConfig.Manifest.readAndroidManifestAsync(flavorPath);
    assertAtMostOneLauncherTile(
      `app/src/main + app/src/${entry.name} AndroidManifest.xml`,
      main,
      flavor
    );
  }
}

const GRADLE_MARKER = '// @expo-pico/core: one launcher tile check';

/**
 * Returns app/build.gradle with exactly one `apply from:` line for
 * android/one-launcher-tile.gradle at the end. `scriptPath` is relative to
 * the app module directory. Idempotent.
 */
export function applyOneLauncherTileGradle(contents: string, scriptPath: string): string {
  const lines = contents.split('\n');
  const kept = lines
    .filter((line, i) => {
      if (line.trim() === GRADLE_MARKER) return false;
      return !(lines[i - 1]?.trim() === GRADLE_MARKER && line.includes('one-launcher-tile.gradle'));
    })
    .join('\n')
    .replace(/\n+$/, '');
  return `${kept}\n\n${GRADLE_MARKER}\napply from: "${scriptPath}"\n`;
}

/**
 * Path of this package's android/one-launcher-tile.gradle relative to the
 * app module directory, with POSIX separators for Gradle.
 */
export function resolveOneLauncherTileScript(projectRoot: string, appModuleDir: string): string {
  let packageDir = path.resolve(__dirname, '..', '..');
  try {
    packageDir = path.dirname(
      require.resolve('@expo-pico/core/package.json', { paths: [projectRoot] })
    );
  } catch {
    // Not resolvable from the app (tests, linked checkouts): use this file's package.
  }
  const script = path.join(packageDir, 'android', 'one-launcher-tile.gradle');
  return path.relative(appModuleDir, script).split(path.sep).join('/');
}
