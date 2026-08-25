import { ConfigPlugin, withSettingsGradle } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

import type { ResolvedPicoOptions } from './types';

export const PICO_NITRO_INCLUDE_MARKER = '// expo-pico-core: @expo-pico/* Nitro module inclusion';

/**
 * Every package in the family that ships an Android Gradle module.
 *
 * `@expo-pico/app-kit` is absent deliberately — it is TypeScript only.
 */
export const PICO_NATIVE_PACKAGES: readonly string[] = [
  '@expo-pico/account',
  '@expo-pico/achievements',
  '@expo-pico/core',
  '@expo-pico/iap',
  '@expo-pico/leaderboards',
  '@expo-pico/notifications',
  '@expo-pico/rooms',
  '@expo-pico/rtc',
  '@expo-pico/social',
  '@expo-pico/spatial',
  '@expo-pico/storage',
  '@expo-pico/subscription',
];

/**
 * Gradle project name for an npm package.
 *
 * Deliberately identical to `convertPackageToProjectName` in
 * `expo-modules-autolinking/build/platforms/android.js`: strip a leading
 * `@`, then collapse every run of non-word characters to a single dash.
 * `@expo-pico/core` becomes `expo-pico-core`.
 *
 * Matching that algorithm is the point. If Expo's autolinker is also
 * active it emits exactly these names, so {@link isAlreadyIncluded} sees
 * its `include` line and this plugin stays out of the way. Diverging here
 * would include the same directory twice under two names, and Gradle would
 * compile the module twice into one APK.
 */
export function gradleProjectName(packageName: string): string {
  return packageName.replace(/^@/g, '').replace(/\W+/g, '-');
}

/**
 * True when `settings.gradle` already includes this Gradle project, under
 * any of the syntaxes the various autolinkers emit.
 */
export function isAlreadyIncluded(contents: string, projectName: string): boolean {
  const escaped = projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`include\\s*\\(?\\s*['"]:${escaped}['"]`, 'm').test(contents);
}

export interface PicoNativeModule {
  packageName: string;
  projectName: string;
  /** Absolute path to the package's `android` directory. */
  androidDir: string;
}

/**
 * Locate the installed packages that have an Android module to include.
 *
 * Resolution is rooted at the consuming app so it works with yarn/npm
 * hoisting, pnpm's nested store, and a monorepo `workspace:` link alike.
 * A package that is not installed, or is installed without an `android`
 * directory, is skipped rather than guessed at.
 */
export function findPicoNativeModules(
  projectRoot: string,
  packages: readonly string[] = PICO_NATIVE_PACKAGES
): PicoNativeModule[] {
  const found: PicoNativeModule[] = [];
  for (const packageName of packages) {
    let packageJsonPath: string;
    try {
      packageJsonPath = require.resolve(`${packageName}/package.json`, {
        paths: [projectRoot],
      });
    } catch {
      continue;
    }
    const androidDir = path.join(path.dirname(packageJsonPath), 'android');
    if (!fs.existsSync(path.join(androidDir, 'build.gradle'))) continue;
    found.push({
      packageName,
      projectName: gradleProjectName(packageName),
      androidDir,
    });
  }
  return found;
}

/**
 * Render the `include` / `projectDir` lines for the modules not yet in
 * `settings.gradle`, or `null` when every one is already there.
 *
 * Paths are written relative to the app's `android` directory and with
 * forward slashes, so the generated file is identical on Windows and
 * POSIX and does not change between machines.
 */
export function renderIncludeBlock(
  modules: readonly PicoNativeModule[],
  androidProjectRoot: string,
  existingContents: string
): string | null {
  const missing = modules.filter((m) => !isAlreadyIncluded(existingContents, m.projectName));
  if (missing.length === 0) return null;

  const lines = missing.flatMap((m) => {
    const relative = path.relative(androidProjectRoot, m.androidDir).split(path.sep).join('/');
    return [
      `include ':${m.projectName}'`,
      `project(':${m.projectName}').projectDir = new File(rootProject.projectDir, '${relative}')`,
    ];
  });

  return `
${PICO_NITRO_INCLUDE_MARKER}
//
// Each @expo-pico/* package is a self-contained Nitro module: it declares
// no dependency on any sibling Gradle project, so the order these are
// included in does not matter and none of them can be missing a peer.
//
// These lines are only written for projects that are not already included.
// The names match expo-modules-autolinking's own algorithm exactly, so
// when that autolinker is active this block stays empty rather than
// including the same directory a second time.
${lines.join('\n')}
`;
}

/**
 * Make sure every installed `@expo-pico/*` Android module is a Gradle
 * project in the consuming app.
 *
 * These packages used to rely on Expo Modules autolinking, which included
 * them because each shipped an `expo-module.config.json` listing Android
 * modules. The Nitro migration dropped those files — the Kotlin no longer
 * extends Expo's `Module`, so the generated Expo package list would
 * reference classes that are not compiled. Nitro itself has no autolinker
 * that writes `settings.gradle`; it only generates the per-module Gradle
 * and CMake fragments that a project applies once it *is* included.
 *
 * So inclusion is done here, deterministically, rather than left to
 * whichever autolinker happens to run.
 */
export const withPicoNitroModules: ConfigPlugin<ResolvedPicoOptions> = (config, options) => {
  if (!options.enabled) return config;

  return withSettingsGradle(config, (config) => {
    const modules = findPicoNativeModules(config.modRequest.projectRoot);
    if (modules.length === 0) {
      console.warn(
        '[expo-pico-core] No @expo-pico/* package with an android/build.gradle was ' +
          'found from the project root. Nothing was added to settings.gradle.'
      );
      return config;
    }

    const block = renderIncludeBlock(
      modules,
      config.modRequest.platformProjectRoot,
      config.modResults.contents
    );
    if (block !== null) {
      config.modResults.contents = config.modResults.contents + block;
    }
    return config;
  });
};

export default withPicoNitroModules;
