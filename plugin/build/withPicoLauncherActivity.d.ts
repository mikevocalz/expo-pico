import type { AndroidConfig } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * In-place launcher contract mutation for the PICO-flavor AndroidManifest.
 *
 * Three additions, each independently gated on the resolved `appType`:
 *
 *   1. `<meta-data android:name="pvr.app.type" .../>` at <application>
 *      scope. Required by PICO OS 6 to enumerate the APK as immersive
 *      (`vr`/`mr`) vs 2D fallback. Source: PICO OpenXR Mobile SDK Ch. 4.
 *
 *   2. An additional `<intent-filter>` on `.MainActivity` that re-declares
 *      `MAIN`+`LAUNCHER` and adds the immersive categories
 *      (`org.khronos.openxr.intent.category.IMMERSIVE_HMD` plus the PICO
 *      modern + legacy launcher categories). Adding a *separate*
 *      intent-filter — rather than trying to mutate the existing one — is
 *      the only reliable way to add categories to a launchable activity
 *      via the manifest merger. Both intent-filters end up on the merged
 *      activity; the PICO/OpenXR launcher matches the one with its
 *      category, and the standard 2D launcher matches the original.
 *
 *   3. A `<queries>` block at manifest root listing the PICO system
 *      packages an immersive app needs to bind to once
 *      `targetSdkVersion >= 30`. Without these, system-service binders
 *      silently fail on Android 11+.
 *
 * All three mutations are idempotent: re-applying with the same options
 * does not duplicate meta-data, intent-filters, categories, or query
 * package entries.
 *
 * Note on scope: this function is the launcher contract layer. The
 * provisional `com.pico.spatial.mode` / `com.pico.swan.spatialContainer`
 * meta-data emitted by buildPicoManifest is unrelated and is left
 * untouched here — those keys are spatial-runtime hints, not the
 * launcher-enumeration contract.
 */
export declare function applyLauncherContract(manifest: AndroidConfig.Manifest.AndroidManifest, options: ResolvedPicoOptions, ctx?: {
    hasDevClient?: boolean;
}): AndroidConfig.Manifest.AndroidManifest;
export default applyLauncherContract;
//# sourceMappingURL=withPicoLauncherActivity.d.ts.map