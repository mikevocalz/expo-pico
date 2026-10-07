"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PICO_EYE_TRACKING_PERMISSION = exports.HORIZON_EYE_TRACKING_PERMISSION = void 0;
exports.eyeTrackingPermissionFor = eyeTrackingPermissionFor;
exports.ensureEyeTrackingPermission = ensureEyeTrackingPermission;
const react_native_1 = require("react-native");
const ExpoPicoModule_1 = __importDefault(require("./ExpoPicoModule"));
/** Runtime permission Meta Horizon OS gates eye gaze behind (Quest Pro, Meta VR Glasses). */
exports.HORIZON_EYE_TRACKING_PERMISSION = 'com.oculus.permission.EYE_TRACKING';
/** PICO's eye tracking permission, written by the `eyeTracking` plugin option. */
exports.PICO_EYE_TRACKING_PERMISSION = 'com.picovr.permission.EYE_TRACKING';
/**
 * The eye tracking permission a build of this XR mode asks for, or `null` for
 * the phone build.
 */
function eyeTrackingPermissionFor(mode) {
    switch (mode) {
        case 'quest':
            return exports.HORIZON_EYE_TRACKING_PERMISSION;
        case 'pico-os5':
        case 'pico-swan':
            return exports.PICO_EYE_TRACKING_PERMISSION;
        default:
            return null;
    }
}
// Keyed by permission. An entry stays once a request reached the user; a
// lookup that failed before that is dropped so the next launch tries again.
const pending = new Map();
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
 * The promise settles when the user answers the system dialog. There is no
 * timeout: launching the immersive activity over an open dialog would dismiss
 * it unanswered.
 *
 * `enterImmersiveScene()` calls this before launching the immersive activity.
 * Call it yourself only when you start the scene some other way.
 */
function ensureEyeTrackingPermission(mode) {
    if (react_native_1.Platform.OS !== 'android')
        return Promise.resolve();
    const permission = eyeTrackingPermissionFor(mode);
    if (!permission)
        return Promise.resolve();
    let attempt = pending.get(permission);
    if (!attempt) {
        attempt = requestIfDeclared(permission).then((settled) => {
            if (!settled)
                pending.delete(permission);
        });
        pending.set(permission, attempt);
    }
    return attempt;
}
/** Resolves `true` when the outcome is final for this process. */
async function requestIfDeclared(permission) {
    try {
        const declared = await ExpoPicoModule_1.default.getDeclaredPermissions();
        if (!declared.some((entry) => entry.name === permission))
            return true;
        // A custom permission string; RN's Permission type only lists android.*.
        const target = permission;
        if (await react_native_1.PermissionsAndroid.check(target))
            return true;
        const status = await react_native_1.PermissionsAndroid.request(target);
        if (status !== react_native_1.PermissionsAndroid.RESULTS.GRANTED) {
            console.warn(`[@expo-pico/core] ${permission} was ${status}. Eye gaze stays off; ` +
                `selection uses the hand ray.`);
        }
        return true;
    }
    catch (error) {
        console.warn(`[@expo-pico/core] Could not request ${permission}; selection uses the hand ray.`, error);
        return false;
    }
}
//# sourceMappingURL=eyeTrackingPermission.js.map