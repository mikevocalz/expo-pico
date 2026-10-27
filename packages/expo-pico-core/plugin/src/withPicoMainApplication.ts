import { ConfigPlugin, withMainApplication } from '@expo/config-plugins';

import {
  PICO_MAIN_APP_FLAGS_IMPORT_MARKER,
  PICO_MAIN_APP_FLAGS_MARKER,
  PICO_MAIN_APP_IMPORT_MARKER,
  PICO_MAIN_APP_MARKER,
} from './constants';
import type { ResolvedPicoOptions } from './types';
import { xrModeToNativeEnum } from './types';
import { insertImportAfterPackage, insertLinesAfter } from './util/insertLinesHelper';

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
 *   - `xrMode === 'pico-os5'` or `'pico-swan'` → injects the package and
 *      its import.
 *
 * Kotlin and Java MainApplication shapes are both supported, matching the
 * Viro dual-language path.
 */
export const withPicoMainApplication: ConfigPlugin<ResolvedPicoOptions> = (config, options) => {
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
  //    the user may have toggled xrMode (PICO_OS5 ↔ PICO_SWAN) between runs;
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

  // 4. Guard the New Architecture flags across the VR activity hop.
  contents = injectNewArchFlagGuard(contents);

  return contents;
}

/**
 * Keeps `skipActivityIdentityAssertionOnHostPause` on for the whole process,
 * without dropping the app back to the old architecture.
 *
 * react-viro launches its immersive `VRActivity` in a separate task, so
 * `MainActivity.onPause` is delivered late — after `VRActivity.onResume` has
 * already promoted the shared ReactHost. `ReactHostImpl.onHostPause` then sees a
 * different current activity. react-viro's `VRLauncherModule` sets the flag that
 * downgrades that assertion just before `startActivity`, but under Expo the pause
 * runs in a coroutine, so a per-launch set can land too late. Setting it once at
 * startup makes the ordering irrelevant.
 *
 * The trap this exists to prevent: `dangerouslyForceOverride` REPLACES the flag
 * provider wholesale, so overriding
 * `ReactNativeFeatureFlagsDefaults` — which reports `enableBridgelessArchitecture`
 * as false — silently reverts the app to the bridge. `ReactHost` then never
 * starts: a blank screen, Metro never asked for the bundle, and not one exception
 * in logcat. Extending `ReactNativeNewArchitectureFeatureFlagsDefaults` keeps
 * every new-arch flag at the value `DefaultNewArchitectureEntryPoint` chose, and
 * picks up flags added by future React Native releases that a hand-written list
 * would miss.
 *
 * Placement is load-bearing in both directions: it must come AFTER
 * `loadReactNative`, which maps the JNI the C++ flag accessor needs (before it,
 * `ReactNativeFeatureFlagsCxxInterop.<clinit>` throws), and it must use the
 * forcing variant, since `loadReactNative` has already registered a provider and
 * plain `override()` rejects a second one.
 */
function injectNewArchFlagGuard(source: string): string {
  let contents = stripLineWithMarker(source, PICO_MAIN_APP_FLAGS_MARKER);

  const guardBlock =
    `    ${PICO_MAIN_APP_FLAGS_MARKER}\n` +
    `    ReactNativeFeatureFlags.dangerouslyForceOverride(\n` +
    `        object : ReactNativeNewArchitectureFeatureFlagsDefaults() {\n` +
    `          override fun skipActivityIdentityAssertionOnHostPause(): Boolean = true\n` +
    `        })`;

  const inserted = insertLinesAfter(contents, guardBlock, 'loadReactNative(this)');
  if (!inserted) {
    console.warn(
      '[expo-pico-core] Could not find `loadReactNative(this)` in MainApplication.kt; ' +
        'skipped the New Architecture flag guard. Entering the Viro VR activity may ' +
        'stop timers and Fast Refresh.'
    );
    return contents;
  }
  contents = inserted;

  return insertImportAfterPackage(
    contents,
    `${PICO_MAIN_APP_FLAGS_IMPORT_MARKER}\n` +
      'import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags\n' +
      'import com.facebook.react.internal.featureflags.ReactNativeNewArchitectureFeatureFlagsDefaults'
  );
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
