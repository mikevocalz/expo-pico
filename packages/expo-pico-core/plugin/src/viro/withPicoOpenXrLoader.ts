import {
  ConfigPlugin,
  withAndroidManifest,
  AndroidConfig,
} from '@expo/config-plugins';

/**
 * Opt-in config plugin that adds the OpenXR loader manifest declarations to
 * the **main** AndroidManifest so any flavor (including third-party flavors
 * like ReactVision/Viro's `quest`) inherits them.
 *
 * Why this exists:
 * `withPico` writes the Pico-flavor manifest at
 * `android/app/src/pico/AndroidManifest.xml`. When an app pairs `expo-pico-core`
 * with a renderer that ships its OWN Android source set — Viro's `quest`
 * flavor manifest at `android/app/src/quest/AndroidManifest.xml` is the
 * motivating example — that other flavor doesn't inherit Pico-flavor entries
 * because Android source sets are sibling, not parents.
 *
 * For OpenXR loader linkage on PICO OS to work from inside Viro's `ViroViewOpenXR`,
 * the host APK must declare three things at the *main* manifest level:
 *
 *   1. `<uses-native-library android:name="libopenxr_loader.so" android:required="false"/>`
 *      — required since `targetSdkVersion >= 31` for `System.loadLibrary("openxr_loader")`
 *        inside any native lib (Khronos loader spec).
 *
 *   2. `<uses-permission android:name="org.khronos.openxr.permission.OPENXR"/>` and
 *      `<uses-permission android:name="org.khronos.openxr.permission.OPENXR_SYSTEM"/>`
 *      — required to query PICO's runtime broker. Without them the loader logs:
 *        "Permission Denial ... requires org.khronos.openxr.permission.OPENXR_SYSTEM"
 *
 *   3. `<queries><provider android:authorities="org.khronos.openxr.runtime_broker;
 *      org.khronos.openxr.system_runtime_broker"/></queries>`
 *      — for `targetSdkVersion >= 30` package-visibility, so the loader can
 *        resolve the broker ContentProvider.
 *
 * Diagnostic value: even after applying all three, Viro's `xrCreateInstance`
 * still segfaults on PICO due to an upstream virocore C++ issue (see
 * `docs/VIRO-ON-PICO.md`). This plugin only closes the manifest-level gap;
 * a virocore source patch is required for end-to-end VR rendering on PICO.
 *
 * Idempotent and merge-safe — re-running prebuild won't duplicate entries.
 *
 * Usage:
 *   ```ts
 *   import { withPicoOpenXrLoader } from 'expo-pico-core/plugin/viro';
 *
 *   export default {
 *     expo: {
 *       plugins: [
 *         ['@reactvision/react-viro', { android: { xRMode: ['QUEST'] } }],
 *         withPicoOpenXrLoader,  // after Viro so the merged manifest carries both
 *       ]
 *     }
 *   };
 *   ```
 */
export const withPicoOpenXrLoader: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    config.modResults = applyOpenXrLoader(config.modResults);
    return config;
  });
};

const OPENXR_PERMISSIONS = [
  'org.khronos.openxr.permission.OPENXR',
  'org.khronos.openxr.permission.OPENXR_SYSTEM',
];

const OPENXR_BROKER_AUTHORITIES =
  'org.khronos.openxr.runtime_broker;org.khronos.openxr.system_runtime_broker';

function applyOpenXrLoader(
  manifest: AndroidConfig.Manifest.AndroidManifest
): AndroidConfig.Manifest.AndroidManifest {
  const root = manifest.manifest;

  // 1. uses-permission entries — additive, deduped by android:name.
  const existing = (root['uses-permission'] ??= []);
  for (const name of OPENXR_PERMISSIONS) {
    const found = existing.some((p: any) => p.$?.['android:name'] === name);
    if (!found) existing.push({ $: { 'android:name': name } });
  }

  // 2. queries -> provider entry, additive on authorities string.
  const queriesArr = (root.queries ??= [{}]);
  const queries = queriesArr[0] ?? {};
  queriesArr[0] = queries;
  const providers = ((queries as any).provider ??= []) as Array<{ $: Record<string, string> }>;
  const hasBroker = providers.some(
    (p) => p.$?.['android:authorities']?.includes('org.khronos.openxr.runtime_broker')
  );
  if (!hasBroker) {
    providers.push({
      $: { 'android:authorities': OPENXR_BROKER_AUTHORITIES },
    });
  }

  // 3. uses-native-library inside <application> — additive, deduped by name.
  const application = root.application?.[0];
  if (application) {
    const usesNative = ((application as any)['uses-native-library'] ??= []) as Array<{
      $: Record<string, string>;
    }>;
    const found = usesNative.some(
      (entry) => entry.$?.['android:name'] === 'libopenxr_loader.so'
    );
    if (!found) {
      usesNative.push({
        $: {
          'android:name': 'libopenxr_loader.so',
          'android:required': 'false',
        },
      });
    }

    // 4. pvr.app.type=vr meta-data — REQUIRED. Pico's runtime gates
    //    xrCreateInstance on this declaration; without it the call returns
    //    XR_ERROR_VALIDATION_FAILURE (-1) and no immersive session can start.
    //    See docs/VIRO-ON-PICO.md for the device-validated diagnostic chain.
    const metaData = ((application as any)['meta-data'] ??= []) as Array<{
      $: Record<string, string>;
    }>;
    const hasPvrAppType = metaData.some(
      (m) => m.$?.['android:name'] === 'pvr.app.type'
    );
    if (!hasPvrAppType) {
      metaData.push({
        $: { 'android:name': 'pvr.app.type', 'android:value': 'vr' },
      });
    }
  }

  return manifest;
}

export default withPicoOpenXrLoader;
