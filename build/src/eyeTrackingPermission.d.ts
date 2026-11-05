import type { PicoXRMode } from './types';
/** Runtime permission Meta Horizon OS gates eye gaze behind (Quest Pro, Meta VR Glasses). */
export declare const HORIZON_EYE_TRACKING_PERMISSION = "com.oculus.permission.EYE_TRACKING";
/** PICO's eye tracking permission, written by the `eyeTracking` plugin option. */
export declare const PICO_EYE_TRACKING_PERMISSION = "com.picovr.permission.EYE_TRACKING";
/**
 * The XR mode this build was made for, read from the native module. Same
 * normalization as `getXrMode()` in the package entry, which delegates here.
 */
export declare function buildXrMode(): PicoXRMode;
/**
 * The eye tracking permission a build of this XR mode asks for, or `null` for
 * the phone build.
 */
export declare function eyeTrackingPermissionFor(mode: PicoXRMode): string | null;
/** Horizon OS device feature for eye tracking. Quest Pro has it; Quest 3 and 3S do not. */
export declare const HORIZON_EYE_TRACKING_FEATURE = "oculus.software.eye_tracking";
/**
 * Device feature names that mean PICO eye tracking hardware. PICO documents
 * the permission (`com.picovr.permission.EYE_TRACKING`) but no uses-feature
 * string, so a device reporting either name counts. The first is the one the
 * plugin's `eyeTracking` option declares (`PICO_FEATURES.EYE_TRACKING`).
 * PICO 4 Ultra reports neither.
 */
export declare const PICO_EYE_TRACKING_FEATURES: readonly ["pico.hardware.eyetracking", "picovr.software.eye_tracking"];
/** The PICO eye tracking feature the plugin declares. */
export declare const PICO_EYE_TRACKING_FEATURE: "pico.hardware.eyetracking";
/**
 * Ask for the platform's eye tracking permission once per process.
 *
 * Viro's OpenXR renderer targets with `XR_EXT_eye_gaze_interaction`, and the
 * runtime leaves the gaze pose inactive until the app holds the permission. On
 * Meta VR Glasses, which have no controllers, that means look-and-pinch never
 * activates and selection falls back to the hand ray. The manifest entry alone
 * is not enough: the permission is a runtime one and nothing else requests it.
 *
 * Asks only when the build's manifest declares the permission, it is not
 * granted yet, and the device has eye tracking hardware (the
 * `oculus.software.eye_tracking` feature, or one of `PICO_EYE_TRACKING_FEATURES`),
 * and never on the `mobile` flavor. PICO builds also need the plugin's
 * `eyeTracking` option. The request goes through the immersive activity, so
 * the grant dialog opens in its task and XR stays open behind it. A denial is logged, not
 * thrown, so the caller carries on with the hand ray. After "don't ask again"
 * Android answers `never_ask_again` without showing a dialog, and the one
 * request per process keeps a declined prompt from coming back every time the
 * scene opens. A failure before the request reached the user (no activity yet,
 * a native error) is retried on the next call.
 *
 * Call it from the immersive activity, never from the 2D panel. Meta's
 * porting guide: "Hybrid apps that need eye tracking in immersive mode must
 * declare the permission but only request it at runtime when the immersive
 * activity launches." A request from the panel fails the Look and Pinch
 * review, which is why `enterImmersiveScene()` does not ask.
 *
 * The root registered with `registerImmersiveScene()` calls this when it
 * mounts in the immersive activity. Call it yourself only when the immersive
 * activity mounts a root of its own, such as Viro's `ViroQuestEntryPoint`:
 * `useEffect(() => { ensureEyeTrackingPermission(getXrMode()); }, [])`
 * in that scene.
 *
 * The promise never rejects. It settles when the user answers the system
 * dialog, so do not hold the scene's first frame on it.
 */
export declare function ensureEyeTrackingPermission(mode: PicoXRMode): Promise<void>;
//# sourceMappingURL=eyeTrackingPermission.d.ts.map