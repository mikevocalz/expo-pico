import type { AndroidConfig } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Mark `.VRActivity` as PICO's immersive activity. Idempotent.
 *
 * Mutates:
 *   1. `.VRActivity` <intent-filter>: a single `tools:node="removeAll"`
 *      marker, so the PICO variant drops every intent-filter the main
 *      manifest gave this activity. An older @reactvision/react-viro wrote
 *      MAIN + com.oculus.intent.category.VR there, which PICO OS listed as a
 *      second app-library tile. VRLauncher starts VRActivity with an explicit
 *      intent, and PICO runs it immersive with no intent-filter (checked on a
 *      PICO 4 Ultra, OS 5.15.7), so the activity needs none.
 *   2. `.VRActivity` <meta-data>: `com.pico.spatial.mode=full-space` so the
 *      activity gets the exclusive HMD surface (not a 2D window-container).
 *   3. `.VRActivity` <meta-data>: `pvr.app.type=vr` activity-scope override
 *      so PICO treats VRActivity as immersive even when the app-level type
 *      is `mr` (panel + immersive coexist).
 *
 * Gated on `appType` being `vr` or `mr`: only those host an XR scene.
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