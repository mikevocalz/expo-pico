import { PermissionsAndroid, Platform, type Permission } from 'react-native';

import ExpoPicoModule from './ExpoPicoModule';
import type { PicoXRMode } from './types';

/** Runtime permission Meta Horizon OS gates eye gaze behind (Quest Pro, Meta VR Glasses). */
export const HORIZON_EYE_TRACKING_PERMISSION = 'com.oculus.permission.EYE_TRACKING';

/** PICO's eye tracking permission, written by the `eyeTracking` plugin option. */
export const PICO_EYE_TRACKING_PERMISSION = 'com.picovr.permission.EYE_TRACKING';

/**
 * The XR mode this build was made for, read from the native module. Same
 * normalization as `getXrMode()` in the package entry, which delegates here.
 */
export function buildXrMode(): PicoXRMode {
  const mode = ExpoPicoModule.xrMode;
  if (mode === 'pico-os5' || mode === 'pico-swan' || mode === 'quest') return mode;
  return 'mobile';
}

/**
 * The eye tracking permission a build of this XR mode asks for, or `null` for
 * the phone build.
 */
export function eyeTrackingPermissionFor(mode: PicoXRMode): string | null {
  switch (mode) {
    case 'quest':
      return HORIZON_EYE_TRACKING_PERMISSION;
    case 'pico-os5':
    case 'pico-swan':
      return PICO_EYE_TRACKING_PERMISSION;
    default:
      return null;
  }
}

// Keyed by permission. An entry stays once a request reached the user; a
// lookup that failed before that is dropped so the next launch tries again.
const pending = new Map<string, Promise<void>>();

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
export function ensureEyeTrackingPermission(mode: PicoXRMode): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  const permission = eyeTrackingPermissionFor(mode);
  if (!permission) return Promise.resolve();

  let attempt = pending.get(permission);
  if (!attempt) {
    attempt = requestIfDeclared(permission).then((settled) => {
      if (!settled) pending.delete(permission);
    });
    pending.set(permission, attempt);
  }
  return attempt;
}

/** Resolves `true` when the outcome is final for this process. */
async function requestIfDeclared(permission: string): Promise<boolean> {
  try {
    const declared = await ExpoPicoModule.getDeclaredPermissions();
    if (!declared.some((entry) => entry.name === permission)) return true;

    // A custom permission string; RN's Permission type only lists android.*.
    const target = permission as Permission;
    if (await PermissionsAndroid.check(target)) return true;

    const status = await PermissionsAndroid.request(target);
    if (status !== PermissionsAndroid.RESULTS.GRANTED) {
      console.warn(
        `[@expo-pico/core] ${permission} was ${status}. Eye gaze stays off; ` +
          `selection uses the hand ray.`
      );
    }
    return true;
  } catch (error) {
    console.warn(
      `[@expo-pico/core] Could not request ${permission}; selection uses the hand ray.`,
      error
    );
    return false;
  }
}
