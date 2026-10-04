import type { AndroidConfig } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Hardware capability manifest mutation for the PICO-flavor manifest.
 *
 * Emits `uses-feature`, `uses-permission`, and `<application>`-level
 * `meta-data` entries for the capabilities the consumer opted into:
 *
 *   - Eye tracking:        `pico.hardware.eyetracking`  + `com.picovr.permission.EYE_TRACKING`
 *   - Face tracking:       `pico.hardware.facetracking` + `com.picovr.permission.FACE_TRACKING`
 *   - Body tracking:       `pico.hardware.bodytracking` + `com.picovr.permission.BODY_TRACKING`
 *   - Spatial audio:       `pico.hardware.spatialaudio`
 *   - Foveated rendering:  `pico.hardware.foveation` + `com.pico.foveation.enabled` meta-data
 *   - High sampling rate:  `android.permission.HIGH_SAMPLING_RATE_SENSORS`
 *   - Refresh rates:       `com.pico.refreshRates` meta-data with comma-separated Hz values
 *
 * All `uses-feature` entries are emitted with `android:required="false"`
 * so a device that lacks the capability still installs the APK — the
 * consumer is expected to gate runtime usage on
 * `PackageManager.hasSystemFeature(...)`.
 *
 * Idempotent: each entry is keyed by `android:name`, so re-apply updates
 * in place rather than duplicating. Capabilities that are toggled off
 * between prebuilds are removed from the manifest.
 *
 * Note: this helper is the capability *declaration* layer. Runtime
 * bindings to the corresponding PICO SDK surfaces (eye-gaze provider,
 * face-tracker callbacks, scene mesh, body/face tracking, haptics)
 * are implemented in `expo-pico-spatial` and `expo-pico-core` native modules.
 */
export declare function applyCapabilityContract(manifest: AndroidConfig.Manifest.AndroidManifest, options: ResolvedPicoOptions): AndroidConfig.Manifest.AndroidManifest;
export default applyCapabilityContract;
//# sourceMappingURL=withPicoCapabilities.d.ts.map