import { ConfigPlugin, withMainApplication } from '@expo/config-plugins';

import {
  PICO_MAIN_APP_FLAGS_IMPORT_MARKER,
  PICO_MAIN_APP_FLAGS_MARKER,
  PICO_MAIN_APP_IMPORT_MARKER,
  PICO_MAIN_APP_MARKER,
} from './constants';
import type { ResolvedPicoOptions } from './types';
import { insertImportAfterPackage, insertLinesAfter } from './util/insertLinesHelper';

/**
 * MainApplication edits for PICO builds (`xrMode` other than `'mobile'`):
 *
 *   - Adds the New Architecture flag guard for the Viro VR activity hop
 *     (Kotlin only; see `injectNewArchFlagGuard`).
 *   - Strips the `PicoCorePackage` registration older prebuilds injected.
 *     Core is an autolinked Expo Module, so it needs no manual registration.
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
  _options: ResolvedPicoOptions
): string | null {
  return injectNewArchFlagGuard(stripLegacyPackageRegistration(source));
}

/**
 * Removes the `PicoCorePackage` registration and its imports that older
 * prebuilds injected. Core is an autolinked Expo Module now and reads its
 * platform from `BuildConfig.PICO_XR_MODE`, so nothing registers it by hand;
 * the old lines reference classes that no longer exist and fail to compile.
 */
function stripLegacyPackageRegistration(source: string): string {
  const withoutCall = stripLineWithMarker(source, PICO_MAIN_APP_MARKER);
  return stripLineWithMarker(withoutCall, PICO_MAIN_APP_IMPORT_MARKER, 2);
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
  _options: ResolvedPicoOptions
): string | null {
  return stripLegacyPackageRegistration(source);
}

/**
 * Removes the marker comment line and the `following` lines after it (the
 * call or imports it labels). Returns the original string if the marker is
 * not present.
 */
function stripLineWithMarker(source: string, marker: string, following = 1): string {
  if (!source.includes(marker)) {
    return source;
  }
  const lines = source.split('\n');
  const idx = lines.findIndex((line) => line.includes(marker));
  if (idx === -1 || idx + following >= lines.length) {
    return source;
  }
  const before = lines.slice(0, idx);
  const after = lines.slice(idx + 1 + following);
  return [...before, ...after].join('\n');
}

export default withPicoMainApplication;
