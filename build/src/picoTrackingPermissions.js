"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PICO_SPATIAL_DATA_PERMISSION = exports.PICO_HAND_TRACKING_PERMISSION = void 0;
exports.ensureHandTrackingPermission = ensureHandTrackingPermission;
exports.ensureSpatialDataPermission = ensureSpatialDataPermission;
const react_native_1 = require("react-native");
const ExpoPicoModule_1 = __importDefault(require("./ExpoPicoModule"));
/** Hand joint data. Written by the plugin's `handTracking` option. */
exports.PICO_HAND_TRACKING_PERMISSION = 'com.picovr.permission.HAND_TRACKING';
/**
 * Mixed reality spatial data: anchors, scene capture, planes and the spatial
 * mesh. Written by the plugin's `spatialData`, `sceneMesh` and
 * `sceneUnderstanding` options.
 */
exports.PICO_SPATIAL_DATA_PERMISSION = 'com.picovr.permission.SPATIAL_DATA';
/** What a missing grant turns off, for the denial warning. */
const WITHOUT_GRANT = {
    [exports.PICO_HAND_TRACKING_PERMISSION]: 'PICO returns no hand joints',
    [exports.PICO_SPATIAL_DATA_PERMISSION]: 'anchors, planes and the spatial mesh stay unavailable',
};
function isPicoBuild(mode) {
    return mode === 'pico-os5' || mode === 'pico-swan';
}
// Keyed by permission. An entry stays once a request reached the user; a
// request that never reached the user is dropped so the next call tries again.
const pending = new Map();
function ensurePicoPermission(mode, permission) {
    if (react_native_1.Platform.OS !== 'android' || !isPicoBuild(mode))
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
        // The manifest carries the permission only when a plugin option wrote it.
        const declared = await ExpoPicoModule_1.default.getDeclaredPermissions();
        const entry = declared.find((candidate) => candidate.name === permission);
        if (!entry || entry.granted)
            return true;
        // Through the immersive activity, never PermissionsAndroid, for the same
        // reason as eye tracking: the React context's current activity can be the
        // 2D panel, and a dialog in the panel's task closes the immersive one.
        // From the panel this resolves `no_immersive_activity` without a dialog.
        const status = await ExpoPicoModule_1.default.requestImmersivePermission(permission);
        if (status === 'no_immersive_activity')
            return false;
        if (status !== 'granted') {
            console.warn(`[@expo-pico/core] ${permission} was ${status}; ${WITHOUT_GRANT[permission]}.`);
        }
        return true;
    }
    catch (error) {
        console.warn(`[@expo-pico/core] Could not request ${permission}.`, error);
        return false;
    }
}
/**
 * Ask for `com.picovr.permission.HAND_TRACKING` once per process.
 *
 * PICO Spatial SDK 6.2.8 made hand tracking a runtime grant: without it the
 * runtime reports the data as unavailable and returns no hand joints, even
 * with the permission in the manifest. Asks only on PICO builds, only when
 * the plugin's `handTracking` option declared the permission, and only when
 * it is not granted yet.
 *
 * The request opens in the immersive activity. Called from the 2D panel it
 * does not prompt and is retried on the next call, so the panel never steals
 * the dialog. The root registered with `registerImmersiveScene()` calls this
 * on mount, and `hand.enable()` calls it before enabling. The promise never
 * rejects; a denial is logged.
 */
function ensureHandTrackingPermission(mode) {
    return ensurePicoPermission(mode, exports.PICO_HAND_TRACKING_PERMISSION);
}
/**
 * Ask for `com.picovr.permission.SPATIAL_DATA` once per process.
 *
 * PICO Spatial SDK 6.2.8 made mesh and plane tracking a runtime grant, and
 * calls without it fail with ERROR_PERMISSION_INSUFFICIENT. Asks only on PICO
 * builds, only when the plugin's `spatialData`, `sceneMesh` or
 * `sceneUnderstanding` option declared the permission, and only when it is
 * not granted yet. The grant belongs to the app, so it also covers
 * `@expo-pico/spatial` anchor and scene mesh calls.
 *
 * Same request path and retry rules as {@link ensureHandTrackingPermission}.
 * The registered immersive root calls this on mount, and the `scene.*`
 * helpers call it first.
 */
function ensureSpatialDataPermission(mode) {
    return ensurePicoPermission(mode, exports.PICO_SPATIAL_DATA_PERMISSION);
}
//# sourceMappingURL=picoTrackingPermissions.js.map