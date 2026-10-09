import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Render the `productFlavors { ... }` block injected into `app/build.gradle`.
 *
 * Extracted from the plugin so unit tests can verify the string shape
 * (ABI filter presence, dual-flavor suffix, SDK version interpolation)
 * without spinning up the full @expo/config-plugins mod pipeline.
 *
 * The `pico` (and `dual`) flavors get `ndk { abiFilters 'arm64-v8a' }`
 * when `options.ndkAbiFilters` is true. PICO 4 / 4 Ultra / Swan are all
 * 64-bit ARM. Renderer-agnostic — same filter whether the app renders
 * with `@reactvision/react-viro`, Unity-as-a-Library, or any other
 * Android-side renderer.
 *
 * The `mobile` flavor is deliberately never ABI-filtered so phone /
 * tablet builds keep whatever abiFilters the consuming app already set.
 */
export declare function renderFlavorBlock(options: ResolvedPicoOptions): string;
/**
 * Render the per-flavor `PICO_XR_MODE` / `PICO_APP_TYPE` overrides.
 *
 * `android.defaultConfig` carries the configured `xrMode` / `appType`, and
 * every flavor inherits it. Without these overrides the `quest` and `mobile`
 * APKs report `pico-os5` at runtime. A flavor's `buildConfigField` replaces
 * the defaultConfig field of the same name, so:
 *   - `pico` / `dual`: keep the configured values from defaultConfig
 *   - `quest`: `PICO_XR_MODE = "quest"`, `PICO_APP_TYPE` = configured appType,
 *     read from gradle.properties (`picoAppType`) at build time so a changed
 *     appType applies on the next prebuild even though this block is not
 *     rewritten
 *   - `mobile`: `PICO_XR_MODE = "mobile"`, `PICO_APP_TYPE = "2d"`
 *
 * Only emitted when the app has flavors (`buildVariant` `pico` or `dual`);
 * a `mobile` buildVariant app has a single variant that keeps the configured
 * values. The library module applies the same mapping to its own BuildConfig
 * (see `android/build.gradle`), which is the one `PicoCoreV2` reads.
 */
export declare function renderFlavorXrModeBlock(options: ResolvedPicoOptions): string;
/**
 * Fail every pico/dual Gradle build when the APK would ship without
 * `pvr.app.id`. On PICO OS that APK never starts: XRShell shows "No
 * entitlement info in the local cache" and ends the process (PICO 4 Ultra,
 * Android 14). A prebuild warning was not enough, so the build stops here.
 *
 * Rewritten on every prebuild from the ID that prebuild resolved, so setting
 * `PICO_APP_ID` and re-running prebuild removes it. Hooked on `pre<Variant>Build`
 * so quest, mobile, iOS and `expo start` never hit it. `appType: '2d'` is
 * exempt: it opts out of the immersive launcher on purpose.
 */
export declare function updateIdentityGate(contents: string, options: ResolvedPicoOptions): string;
/**
 * Let the overlay copies win over the AAR's in the variants that get them:
 * pico/dual take both libraries, quest takes only the renderer (see
 * `syncPicoOverlays`). Mobile gets neither. Also removes our old global rule.
 */
export declare function updateOverlayPackaging(contents: string, options: ResolvedPicoOptions): string;
export declare const withPicoAppBuildGradle: ConfigPlugin<ResolvedPicoOptions>;
export declare const withPicoProjectBuildGradle: ConfigPlugin<ResolvedPicoOptions>;
declare const _default: {
    withPicoAppBuildGradle: ConfigPlugin<ResolvedPicoOptions>;
    withPicoProjectBuildGradle: ConfigPlugin<ResolvedPicoOptions>;
};
export default _default;
//# sourceMappingURL=withPicoGradle.d.ts.map