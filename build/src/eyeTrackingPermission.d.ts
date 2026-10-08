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
/**
 * Ask for the platform's eye tracking permission once per process.
 *
 * Viro's OpenXR renderer targets with `XR_EXT_eye_gaze_interaction`, and the
 * runtime leaves the gaze pose inactive until the app holds the permission. On
 * Meta VR Glasses, which have no controllers, that means look-and-pinch never
 * activates and selection falls back to the hand ray. The manifest entry alone
 * is not enough: the permission is a runtime one and nothing else requests it.
 *
 * Asks only when the build's manifest declares the permission and it is not
 * granted yet, and never on the `mobile` flavor. A denial is logged, not
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