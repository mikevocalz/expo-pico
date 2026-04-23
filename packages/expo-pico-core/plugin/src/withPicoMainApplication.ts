import { ConfigPlugin, withMainApplication } from '@expo/config-plugins';

import {
  PICO_MAIN_APP_IMPORT_MARKER,
  PICO_MAIN_APP_MARKER,
} from './constants';
import type { ResolvedPicoOptions } from './types';
import { xrModeToNativeEnum } from './types';
import {
  insertImportAfterPackage,
  insertLinesAfter,
} from './util/insertLinesHelper';

/**
 * Injects PICO core React Native package registration into MainApplication.
 *
 * Mirrors the Viro `withBranchAndroid` pattern (Quest/OVR_MOBILE registers
 * `ReactViroPackage(ViroPlatform.OVR_MOBILE)`) but with two corrections:
 *
 *   1. **Marker-based dedupe.** Viro's helper uses substring match on the
 *      whole insertion. That means re-running with a different `xRMode`
 *      accumulates `add(...)` calls. We register the package exactly once
 *      using a stable marker comment as the dedupe key, then re-emit a
 *      fresh registration block on each prebuild.
 *   2. **Single package, platform enum carried in.** Viro registers one
 *      package per mode. PICO Swan + PICO OS 6 are mutually exclusive at
 *      boot (the runtime can only target one platform), so we register a
 *      single `PicoCorePackage(PicoXRPlatform.<MODE>)`.
 *
 * Activation:
 *   - `xrMode === 'mobile'` → no MainApplication injection (Expo Modules
 *      auto-registration covers the runtime detection module).
 *   - `xrMode === 'pico-os6'` or `'pico-swan'` → injects the package and
 *      its import.
 *
 * Kotlin and Java MainApplication shapes are both supported, matching the
 * Viro dual-language path.
 */
export const withPicoMainApplication: ConfigPlugin<ResolvedPicoOptions> = (
  config,
  options
) => {
  if (options.xrMode === 'mobile') {
    return config;
  }

  return withMainApplication(config, (config) => {
    const language = config.modResults.language;
    const original = config.modResults.contents;
    const updated =
      language === 'java'
        ? injectIntoJavaMainApplication(original, options)
        : injectIntoKotlinMainApplication(original, options);
    config.modResults.contents = updated ?? original;
    return config;
  });
};

export function injectIntoKotlinMainApplication(
  source: string,
  options: ResolvedPicoOptions
): string | null {
  const platformEnum = xrModeToNativeEnum(options.xrMode);

  const importBlock = `${PICO_MAIN_APP_IMPORT_MARKER}\nimport expo.modules.pico.PicoCorePackage\nimport expo.modules.pico.PicoXRPlatform`;

  const registrationBlock =
    `            ${PICO_MAIN_APP_MARKER}\n` +
    `            add(PicoCorePackage(PicoXRPlatform.${platformEnum}))`;

  let contents = source;

  // 1. Strip any prior registration block and re-emit. We re-emit because
  //    the user may have toggled xrMode (PICO_OS6 ↔ PICO_SWAN) between runs;
  //    leaving the old line would result in two registrations.
  contents = stripLineWithMarker(contents, PICO_MAIN_APP_MARKER);

  // 2. Insert the new registration block after the first PackageList anchor
  //    that the Expo template emits. Try the standard anchors in order.
  const anchors = [
    'val packages = PackageList(this).packages',
    '// add(MyReactNativePackage())',
    '// packages.add(MyReactNativePackage())',
  ];

  let inserted: string | null = null;
  for (const anchor of anchors) {
    inserted = insertLinesAfter(contents, registrationBlock, anchor);
    if (inserted) break;
  }
  if (!inserted) {
    console.warn(
      '[expo-pico-core] Could not find a PackageList anchor in MainApplication.kt; ' +
        'PicoCorePackage was not registered. Add `add(PicoCorePackage(PicoXRPlatform.' +
        platformEnum +
        '))` to your getPackages() override manually.'
    );
    return null;
  }
  contents = inserted;

  // 3. Add the import (idempotent — helper checks for existing string).
  contents = insertImportAfterPackage(contents, importBlock);

  return contents;
}

export function injectIntoJavaMainApplication(
  source: string,
  options: ResolvedPicoOptions
): string | null {
  const platformEnum = xrModeToNativeEnum(options.xrMode);

  const importBlock = `${PICO_MAIN_APP_IMPORT_MARKER}\nimport expo.modules.pico.PicoCorePackage;\nimport expo.modules.pico.PicoXRPlatform;`;

  const registrationBlock =
    `      ${PICO_MAIN_APP_MARKER}\n` +
    `      packages.add(new PicoCorePackage(PicoXRPlatform.${platformEnum}));`;

  let contents = source;

  contents = stripLineWithMarker(contents, PICO_MAIN_APP_MARKER);

  const inserted = insertLinesAfter(
    contents,
    registrationBlock,
    'List<ReactPackage> packages = new PackageList(this).getPackages();'
  );
  if (!inserted) {
    console.warn(
      '[expo-pico-core] Could not find PackageList anchor in MainApplication.java; ' +
        'PicoCorePackage was not registered. Add `packages.add(new PicoCorePackage(PicoXRPlatform.' +
        platformEnum +
        '));` to your getPackages() override manually.'
    );
    return null;
  }
  contents = inserted;
  contents = insertImportAfterPackage(contents, importBlock);
  return contents;
}

/**
 * Removes the marker comment line and the line that immediately follows it
 * (which carries the registration call). Returns the original string if the
 * marker is not present.
 */
function stripLineWithMarker(source: string, marker: string): string {
  if (!source.includes(marker)) {
    return source;
  }
  const lines = source.split('\n');
  const idx = lines.findIndex((line) => line.includes(marker));
  if (idx === -1 || idx + 1 >= lines.length) {
    return source;
  }
  const before = lines.slice(0, idx);
  const after = lines.slice(idx + 2);
  return [...before, ...after].join('\n');
}

export default withPicoMainApplication;
