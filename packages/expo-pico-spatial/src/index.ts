import {
  createNativeEventEmitter,
  safeAddListener,
  guardService,
  wrapNativeCall,
  type Subscription,
} from '@expo-pico/platform-service-common';

import {
  NativeSpatial,
  NativeEyeGaze,
  NativeSceneMesh,
  NativeFaceTracking,
  NativeBodyTracking,
} from './ExpoPicoSpatialModule';
import type {
  PicoSpaceState,
  PicoContainerType,
  SpatialCapabilities,
  SpatialAnchorHandle,
  SpatialPose,
  WindowContainerProperties,
  GazePose,
  SceneMesh,
  SceneMeshRaw,
  FaceBlendShapes,
  BodyJoint,
} from './types';

export type {
  PicoSpaceState,
  PicoContainerType,
  SpatialCapabilities,
  SpatialAnchorHandle,
  SpatialPose,
  WindowContainerProperties,
  GazePose,
  SceneMesh,
  SceneMeshRaw,
  FaceBlendShapes,
  BodyJoint,
  ExpoPicoSpatialModuleInterface,
  ExpoPicoEyeGazeModuleInterface,
  ExpoPicoSceneMeshModuleInterface,
  ExpoPicoFaceTrackingModuleInterface,
  ExpoPicoBodyTrackingModuleInterface,
} from './types';

export type { Subscription };

const PKG = '@expo-pico/spatial';

// ─── Event emitters (created once at module init) ────────────────────────────

const gazeEmitter = createNativeEventEmitter(NativeEyeGaze);
const meshEmitter = createNativeEventEmitter(NativeSceneMesh);
const faceEmitter = createNativeEventEmitter(NativeFaceTracking);
const bodyEmitter = createNativeEventEmitter(NativeBodyTracking);

// ─── Space / container state ──────────────────────────────────────────────────

/**
 * Returns the current space state the app is operating in.
 *
 * - 'shared-space': Multiple apps visible; app runs in a WindowContainer or panel
 * - 'full-space': App has exclusive use of the spatial environment
 * - 'unknown': Not running on PICO OS 6 or space state not yet determined
 */
export function getSpaceState(): PicoSpaceState {
  const s = NativeSpatial?.spaceState;
  if (s === 'shared-space' || s === 'full-space') return s;
  return 'unknown';
}

export function getContainerType(): PicoContainerType {
  const c = NativeSpatial?.containerType;
  if (c === 'window-container' || c === 'stage') return c;
  return 'none';
}

export function getSpatialCapabilities(): SpatialCapabilities {
  return {
    spaceStates: NativeSpatial?.capabilities?.spaceStates ?? false,
    spatialAnchors: NativeSpatial?.capabilities?.spatialAnchors ?? false,
    sceneUnderstanding: NativeSpatial?.capabilities?.sceneUnderstanding ?? false,
    passthrough: NativeSpatial?.capabilities?.passthrough ?? false,
    handTracking: NativeSpatial?.capabilities?.handTracking ?? false,
    spatialSdkAvailable: NativeSpatial?.capabilities?.spatialSdkAvailable ?? false,
  };
}

export function getSpatialSdkVersion(): string | null {
  return NativeSpatial?.spatialSdkVersion ?? null;
}

// ─── Spatial anchor ───────────────────────────────────────────────────────────

/**
 * Creates a spatial anchor at the given pose.
 *
 * Requires the legacy PICO Spatial SDK 1.x AAR
 * (`com.pvr.spatial:spatial-sdk:1.0.0`) in `vendor/pico-sdk/` or
 * `android/app/libs/`. This is the older PVR-prefixed Spatial SDK —
 * distinct from the modern PPS Maven artifacts (`com.pico.pps:*`) which
 * `expo-pico-core` resolves automatically. Also requires a PICO 4 Ultra
 * or Neo3 device running PICO OS 6+.
 *
 * Rejects with SERVICE_UNAVAILABLE when the SDK is absent.
 * Rejects with VALIDATION_ERROR for malformed pose input.
 */
export async function createSpatialAnchor(pose: SpatialPose): Promise<SpatialAnchorHandle> {
  guardService(NativeSpatial != null, PKG, 'createSpatialAnchor');
  const result = await wrapNativeCall(
    PKG,
    'createSpatialAnchor',
    NativeSpatial!.createSpatialAnchor(pose)
  );
  return {
    anchorId:
      (result as { anchorId?: string; id?: string }).anchorId ??
      (result as { anchorId?: string; id?: string }).id ??
      'unknown',
    persisted: (result as { persisted?: boolean }).persisted ?? false,
  };
}

/**
 * Sets properties for a WindowContainer.
 * Rejects with SERVICE_UNAVAILABLE when the Spatial SDK is absent.
 */
export async function setWindowContainerProperties(
  props: WindowContainerProperties
): Promise<void> {
  guardService(NativeSpatial != null, PKG, 'setWindowContainerProperties');
  await wrapNativeCall(
    PKG,
    'setWindowContainerProperties',
    NativeSpatial!.setWindowContainerProperties(props)
  );
}

/**
 * Requests transition to Full Space mode.
 * Rejects with SERVICE_UNAVAILABLE when the Spatial SDK is absent.
 */
export async function requestFullSpace(): Promise<void> {
  guardService(NativeSpatial != null, PKG, 'requestFullSpace');
  await wrapNativeCall(PKG, 'requestFullSpace', NativeSpatial!.requestFullSpace());
}

// ─── Eye gaze ─────────────────────────────────────────────────────────────────

/**
 * Adds a listener for per-frame eye gaze updates.
 *
 * Fires at vsync frequency on PICO devices with eye tracking hardware and
 * PICO Spatial SDK present. On unsupported devices the subscription
 * is returned but the callback never fires (NULL_SUBSCRIPTION).
 */
export function addGazeListener(cb: (g: GazePose) => void): Subscription {
  return safeAddListener<GazePose>(gazeEmitter, 'onGazeUpdate', cb);
}

/**
 * One-shot gaze snapshot. Returns null when eye gaze is unavailable.
 */
export async function getGazeSnapshot(): Promise<GazePose | null> {
  if (!NativeEyeGaze) return null;
  return wrapNativeCall(PKG, 'getGazeSnapshot', NativeEyeGaze.getGazeSnapshot());
}

/** Returns true when eye gaze SDK is wired and hardware is present. */
export function isEyeGazeAvailable(): boolean {
  return NativeEyeGaze?.eyeGazeAvailable ?? false;
}

// ─── Scene mesh ───────────────────────────────────────────────────────────────

/**
 * Queries the current scene mesh from the PICO Spatial SDK.
 *
 * Normalizes the native plain-number arrays to typed arrays in JS:
 *   vertices → Float32Array,  indices → Uint32Array,  normals → Float32Array
 *
 * Rejects with SERVICE_UNAVAILABLE when the Spatial SDK is absent.
 */
export async function getSceneMesh(): Promise<SceneMesh> {
  guardService(NativeSceneMesh != null, PKG, 'getSceneMesh');
  const raw: SceneMeshRaw = await wrapNativeCall(
    PKG,
    'getSceneMesh',
    NativeSceneMesh!.getSceneMesh()
  );
  return {
    vertices: new Float32Array(raw.vertices),
    indices: new Uint32Array(raw.indices),
    normals: raw.normals ? new Float32Array(raw.normals) : undefined,
  };
}

/**
 * Adds a listener for scene mesh updates.
 * Payload is normalized to typed arrays in JS before the callback fires.
 */
export function addSceneMeshUpdateListener(cb: (m: SceneMesh) => void): Subscription {
  return safeAddListener<SceneMeshRaw>(meshEmitter, 'onSceneMeshUpdate', (raw) => {
    cb({
      vertices: new Float32Array(raw.vertices),
      indices: new Uint32Array(raw.indices),
      normals: raw.normals ? new Float32Array(raw.normals) : undefined,
    });
  });
}

export function isSceneMeshAvailable(): boolean {
  return NativeSceneMesh?.sceneMeshAvailable ?? false;
}

// ─── Face tracking ────────────────────────────────────────────────────────────

/**
 * Adds a listener for per-frame face blendshape updates.
 * Fires at vsync when face tracking is active. Never fires on unsupported runtimes.
 */
export function addFaceListener(cb: (b: FaceBlendShapes) => void): Subscription {
  return safeAddListener<FaceBlendShapes>(faceEmitter, 'onFaceUpdate', cb);
}

export function isFaceTrackingAvailable(): boolean {
  return NativeFaceTracking?.faceTrackingAvailable ?? false;
}

// ─── Body tracking ────────────────────────────────────────────────────────────

/**
 * Adds a listener for per-frame body joint updates.
 * Fires at vsync when body tracking is active. Never fires on unsupported runtimes.
 */
export function addBodyListener(cb: (joints: BodyJoint[]) => void): Subscription {
  return safeAddListener<{ joints: BodyJoint[] }>(bodyEmitter, 'onBodyUpdate', (payload) => {
    cb(payload.joints ?? []);
  });
}

export function isBodyTrackingAvailable(): boolean {
  return NativeBodyTracking?.bodyTrackingAvailable ?? false;
}

export default NativeSpatial;
