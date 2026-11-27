import type { PicoXRMode } from './types';
/** Hand joint data. Written by the plugin's `handTracking` option. */
export declare const PICO_HAND_TRACKING_PERMISSION = "com.picovr.permission.HAND_TRACKING";
/**
 * Mixed reality spatial data: anchors, scene capture, planes and the spatial
 * mesh. Written by the plugin's `spatialData`, `sceneMesh` and
 * `sceneUnderstanding` options.
 */
export declare const PICO_SPATIAL_DATA_PERMISSION = "com.picovr.permission.SPATIAL_DATA";
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
export declare function ensureHandTrackingPermission(mode: PicoXRMode): Promise<void>;
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
export declare function ensureSpatialDataPermission(mode: PicoXRMode): Promise<void>;
//# sourceMappingURL=picoTrackingPermissions.d.ts.map