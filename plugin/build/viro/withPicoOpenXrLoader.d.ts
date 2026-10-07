import { ConfigPlugin } from '@expo/config-plugins';
/**
 * Opt-in config plugin that adds the Khronos OpenXR loader declarations to
 * the **main** AndroidManifest, so every flavor that runs an OpenXR session
 * inherits them. They are vendor-neutral: the Quest build loads the same
 * Khronos loader. The one PICO-specific entry, `pvr.app.type=vr`, is routed
 * through `withPicoFlavorMetaData` and never reaches the quest flavor.
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
export declare const withPicoOpenXrLoader: ConfigPlugin;
export default withPicoOpenXrLoader;
//# sourceMappingURL=withPicoOpenXrLoader.d.ts.map