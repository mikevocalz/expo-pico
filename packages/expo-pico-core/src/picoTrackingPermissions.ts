import { Platform } from 'react-native';

import ExpoPicoModule from './ExpoPicoModule';
import type { PicoXRMode } from './types';

/** Hand joint data. Written by the plugin's `handTracking` option. */
export const PICO_HAND_TRACKING_PERMISSION = 'com.picovr.permission.HAND_TRACKING';

/**
 * Mixed reality spatial data: anchors, scene capture, planes and the spatial
 * mesh. Written by the plugin's `spatialData`, `sceneMesh` and
 * `sceneUnderstanding` options.
 */
export const PICO_SPATIAL_DATA_PERMISSION = 'com.picovr.permission.SPATIAL_DATA';

/** What a missing grant turns off, for the denial warning. */
const WITHOUT_GRANT: Record<string, string> = {
  [PICO_HAND_TRACKING_PERMISSION]: 'PICO returns no hand joints',
  [PICO_SPATIAL_DATA_PERMISSION]: 'anchors, planes and the spatial mesh stay unavailable',
};

function isPicoBuild(mode: PicoXRMode): boolean {
  return mode === 'pico-os5' || mode === 'pico-swan';
}

// Keyed by permission. An entry stays once a request reached the user; a
// request that never reached the user is dropped so the next call tries again.
const pending = new Map<string, Promise<void>>();

function ensurePicoPermission(mode: PicoXRMode, permission: string): Promise<void> {
  if (Platform.OS !== 'android' || !isPicoBuild(mode)) return Promise.resolve();

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
    // The manifest carries the permission only when a plugin option wrote it.
    const declared = await ExpoPicoModule.getDeclaredPermissions();
    const entry = declared.find((candidate) => candidate.name === permission);
    if (!entry || entry.granted) return true;

    // Through the immersive activity, never PermissionsAndroid, for the same
    // reason as eye tracking: the React context's current activity can be the
    // 2D panel, and a dialog in the panel's task closes the immersive one.
    // From the panel this resolves `no_immersive_activity` without a dialog.
    const status = await ExpoPicoModule.requestImmersivePermission(permission);
    if (status === 'no_immersive_activity') return false;
    if (status !== 'granted') {
      console.warn(`[@expo-pico/core] ${permission} was ${status}; ${WITHOUT_GRANT[permission]}.`);
    }
    return true;
  } catch (error) {
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
export function ensureHandTrackingPermission(mode: PicoXRMode): Promise<void> {
  return ensurePicoPermission(mode, PICO_HAND_TRACKING_PERMISSION);
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
export function ensureSpatialDataPermission(mode: PicoXRMode): Promise<void> {
  return ensurePicoPermission(mode, PICO_SPATIAL_DATA_PERMISSION);
}
