import { notImplementedError } from '@expo-pico/platform-service-common';
import ExpoPicoSpatialModule from './ExpoPicoSpatialModule';

const PKG = 'expo-pico-spatial';
const DOCS = 'https://developer.picoxr.com/document/spatial-sdk/';
import type {
  PicoSpaceState,
  PicoContainerType,
  SpatialCapabilities,
  SpatialAnchorHandle,
  Pose3D,
  WindowContainerProperties,
} from './types';

export type {
  PicoSpaceState,
  PicoContainerType,
  SpatialCapabilities,
  SpatialAnchorHandle,
  Pose3D,
  WindowContainerProperties,
  ExpoPicoSpatialModuleInterface,
} from './types';

/**
 * Returns the current space state the app is operating in.
 *
 * - 'shared-space': Multiple apps visible; app runs in a WindowContainer or panel
 * - 'full-space': App has exclusive use of the spatial environment
 * - 'unknown': Not running on PICO OS 6 or space state not yet determined
 *
 * @see https://developer.picoxr.com/document/spatial-sdk/learn-about-spatial-containers-and-space-states/
 */
export function getSpaceState(): PicoSpaceState {
  const s = ExpoPicoSpatialModule.spaceState;
  if (s === 'shared-space' || s === 'full-space') return s;
  return 'unknown';
}

/**
 * Returns the current container type hosting this app.
 */
export function getContainerType(): PicoContainerType {
  const c = ExpoPicoSpatialModule.containerType;
  if (c === 'window-container' || c === 'stage') return c;
  return 'none';
}

/**
 * Returns spatial capability flags for the current device and OS.
 */
export function getSpatialCapabilities(): SpatialCapabilities {
  return {
    spaceStates: ExpoPicoSpatialModule.capabilities?.spaceStates ?? false,
    spatialAnchors: ExpoPicoSpatialModule.capabilities?.spatialAnchors ?? false,
    sceneUnderstanding: ExpoPicoSpatialModule.capabilities?.sceneUnderstanding ?? false,
    passthrough: ExpoPicoSpatialModule.capabilities?.passthrough ?? false,
    handTracking: ExpoPicoSpatialModule.capabilities?.handTracking ?? false,
    spatialSdkAvailable: ExpoPicoSpatialModule.capabilities?.spatialSdkAvailable ?? false,
  };
}

/**
 * Returns the PICO Spatial SDK version string, or null if not available.
 *
 * Extension seam: returns null until PICO Spatial SDK bindings are added
 * to the native module.
 */
export function getSpatialSdkVersion(): string | null {
  return ExpoPicoSpatialModule.spatialSdkVersion ?? null;
}

/**
 * Creates a spatial anchor at the given pose.
 *
 * EXTENSION SEAM — the PICO Spatial SDK anchor API is documented at
 * https://developer.picoxr.com/document/spatial-sdk/spatial-anchor
 * but requires native PICO Spatial SDK Kotlin bindings (AARs from the
 * PICO Maven repo) that are not yet wrapped in this Expo Module.
 *
 * When the native binding is implemented, this function will call
 * the native `createSpatialAnchor` async function and return a real handle.
 *
 * @throws Error — not yet implemented; native binding pending.
 */
export async function createSpatialAnchor(_pose: Pose3D): Promise<SpatialAnchorHandle> {
  throw notImplementedError(PKG, 'createSpatialAnchor', `${DOCS}spatial-anchor`);
}

/**
 * Sets properties for a WindowContainer before or after opening it.
 *
 * EXTENSION SEAM — requires PICO Spatial SDK WindowContainer API bindings.
 * @see https://developer.picoxr.com/document/spatial-sdk/set-properties-for-window-containers/
 */
export async function setWindowContainerProperties(
  _props: WindowContainerProperties
): Promise<void> {
  throw notImplementedError(PKG, 'setWindowContainerProperties', `${DOCS}set-properties-for-window-containers/`);
}

/**
 * Requests transition to Full Space mode.
 *
 * EXTENSION SEAM — requires PICO Spatial SDK space transition API.
 * @see https://developer.picoxr.com/document/spatial-sdk/learn-about-spatial-containers-and-space-states/
 */
export async function requestFullSpace(): Promise<void> {
  throw notImplementedError(PKG, 'requestFullSpace', `${DOCS}learn-about-spatial-containers-and-space-states/`);
}

export default ExpoPicoSpatialModule;
