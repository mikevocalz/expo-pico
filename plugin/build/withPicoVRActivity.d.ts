import type { AndroidConfig } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Add the PICO launcher categories + spatial meta-data to `.VRActivity` so
 * PICO OS treats it as the immersive entry point for this app. Idempotent.
 *
 * Mutates:
 *   1. `.VRActivity` <intent-filter>: add `com.pvr.intent.category.VR`
 *      (PICO modern) + `com.picovr.intent.category.VR` (legacy) so the
 *      activity is reachable as an immersive target.
 *   2. `.VRActivity` <meta-data>: add `com.pico.spatial.mode=immersive`
 *      + `com.pico.spatial.containerMode=immersive` so the activity gets
 *      the exclusive HMD surface (not a 2D window-container).
 *   3. `.VRActivity` <meta-data>: add `pvr.app.type=vr` activity-scope
 *      override so PICO enumerates VRActivity as immersive even when the
 *      app-level type is `mr` (panel + immersive coexist).
 *
 * Gated on `appType` being `vr` or `mr` — only those flavors host an XR
 * scene worth routing PICO immersive into.
 */
export declare function applyVRActivityContract(manifest: AndroidConfig.Manifest.AndroidManifest, options: ResolvedPicoOptions): AndroidConfig.Manifest.AndroidManifest;
/**
 * Emit `<layout android:defaultWidth="…" android:defaultHeight="…"/>` on
 * `.MainActivity` when the user sets the Horizon-parity panel size in the
 * plugin options. Mirrors expo-horizon-core's `withPanelSize`. Idempotent:
 * re-applying replaces existing `<layout>` attrs with current values.
 *
 * Skipped when neither dimension is provided — leaves PICO's default
 * window-container sizing in effect.
 */
export declare function applyPanelSize(manifest: AndroidConfig.Manifest.AndroidManifest, options: ResolvedPicoOptions): AndroidConfig.Manifest.AndroidManifest;
export default applyVRActivityContract;
//# sourceMappingURL=withPicoVRActivity.d.ts.map