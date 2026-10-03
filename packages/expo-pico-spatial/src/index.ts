import { requireOptionalNativeModule } from 'expo-modules-core';

import {
  guardService,
  wrapNativeCall,
  NULL_SUBSCRIPTION,
  type Subscription,
} from '@expo-pico/platform-service-common';

import type { PicoSpatial, SceneMeshRaw, SpatialBodyJoint } from './PicoSpatialNativeTypes';
import type {
  PicoSpaceState,
  PicoContainerType,
  SpatialCapabilities,
  SpatialAnchorHandle,
  SpatialPose,
  WindowContainerProperties,
  GazePose,
  SceneMesh,
  FaceBlendShapes,
  BodyJoint,
} from './types';

export * from './types';
export * from './layout';

import { layoutReadinessFromProbe } from './layout';

const PKG = '@expo-pico/spatial';

const NO_CAPABILITIES: SpatialCapabilities = {
  spaceStates: false,
  spatialAnchors: false,
  sceneUnderstanding: false,
  passthrough: false,
  handTracking: false,
  spatialSdkAvailable: false,
};

type PicoSpatialV2Native = {
  getInfo(): {
    spaceState: string;
    containerType: string;
    spatialSdkVersion?: string | null;
    capabilities: SpatialCapabilities;
    eyeGazeAvailable: boolean;
    sceneMeshAvailable: boolean;
    faceTrackingAvailable: boolean;
    bodyTrackingAvailable: boolean;
  };
  getSpatialSdkProbe(): Record<string, boolean>;
  createSpatialAnchor(pose: SpatialPose): any;
  setWindowContainerProperties(props: WindowContainerProperties): void;
  requestFullSpace(): void;
  getGazeSnapshot(): GazePose | null;
  getSceneMesh(): SceneMeshRaw;
};

let v2Cache: PicoSpatialV2Native | null | undefined;
let v2ListenerId = 0;

function nativeV2(): PicoSpatialV2Native | null {
  if (v2Cache !== undefined) return v2Cache;
  try {
    v2Cache = requireOptionalNativeModule<PicoSpatialV2Native>('PicoSpatialV2');
  } catch {
    v2Cache = null;
  }
  return v2Cache;
}

function native(): PicoSpatial | null {
  const v2 = nativeV2();
  if (v2) {
    const info = () => v2.getInfo();
    return {
      get spaceState() {
        return info().spaceState;
      },
      get containerType() {
        return info().containerType;
      },
      get spatialSdkVersion() {
        return info().spatialSdkVersion ?? undefined;
      },
      get capabilities() {
        return info().capabilities;
      },
      get eyeGazeAvailable() {
        return !!info().eyeGazeAvailable;
      },
      get sceneMeshAvailable() {
        return !!info().sceneMeshAvailable;
      },
      get faceTrackingAvailable() {
        return !!info().faceTrackingAvailable;
      },
      get bodyTrackingAvailable() {
        return !!info().bodyTrackingAvailable;
      },
      getSpatialSdkProbe: async () => v2.getSpatialSdkProbe(),
      createSpatialAnchor: async (pose: any) => v2.createSpatialAnchor(pose),
      setWindowContainerProperties: async (props: any) => v2.setWindowContainerProperties(props),
      requestFullSpace: async () => v2.requestFullSpace(),
      getGazeSnapshot: async () => v2.getGazeSnapshot() ?? undefined,
      getSceneMesh: async () => v2.getSceneMesh(),
      addGazeListener: () => ++v2ListenerId,
      addSceneMeshUpdateListener: () => ++v2ListenerId,
      addFaceListener: () => ++v2ListenerId,
      addBodyListener: () => ++v2ListenerId,
      removeListener: () => {},
    } as unknown as PicoSpatial;
  }
  return null;
}

function toTypedMesh(raw: SceneMeshRaw): SceneMesh {
  return {
    vertices: new Float32Array(raw.vertices),
    indices: new Uint32Array(raw.indices),
    normals: raw.normals ? new Float32Array(raw.normals) : undefined,
  };
}

function subscribe(register: (h: PicoSpatial) => number): Subscription {
  const hybrid = native();
  if (!hybrid) return NULL_SUBSCRIPTION;
  const id = register(hybrid);
  return { remove: () => hybrid.removeListener(id) };
}

// ─── Space / container state ─────────────────────────────────────────────────

/**
 * Current space state.
 *
 * - 'shared-space': other apps visible; this one runs in a WindowContainer
 * - 'full-space': exclusive use of the spatial environment
 * - 'unknown': not PICO OS 6, or not yet determined
 */
export function getSpaceState(): PicoSpaceState {
  const s = native()?.spaceState;
  return s === 'shared-space' || s === 'full-space' ? s : 'unknown';
}

export function getContainerType(): PicoContainerType {
  const c = native()?.containerType;
  return c === 'window-container' || c === 'stage' ? c : 'none';
}

export function getSpatialCapabilities(): SpatialCapabilities {
  return native()?.capabilities ?? NO_CAPABILITIES;
}

export function getSpatialSdkVersion(): string | null {
  return native()?.spatialSdkVersion ?? null;
}

export function getSpatialSdkProbe(): Record<string, boolean> {
  return nativeV2()?.getSpatialSdkProbe() ?? {};
}

export function getSpatialLayoutReadiness() {
  return layoutReadinessFromProbe(getSpatialSdkProbe());
}

// ─── Spatial anchors ─────────────────────────────────────────────────────────

/**
 * Creates a spatial anchor at the given pose.
 *
 * Requires the legacy PVR Spatial SDK 1.x AAR in `vendor/pico-sdk/` or
 * `android/app/libs/` — distinct from the PPS Maven artifacts that
 * expo-pico-core resolves automatically — plus a PICO 4 Ultra or Neo3 on
 * PICO OS 6+.
 *
 * Rejects with SERVICE_UNAVAILABLE when the SDK is absent, VALIDATION_ERROR
 * for a malformed pose.
 */
export async function createSpatialAnchor(pose: SpatialPose): Promise<SpatialAnchorHandle> {
  guardService(native() != null, PKG, 'createSpatialAnchor');
  const result = await wrapNativeCall(
    PKG,
    'createSpatialAnchor',
    native()!.createSpatialAnchor(pose)
  );
  return {
    anchorId: result.anchorId || result.id || 'unknown',
    persisted: result.persisted,
  };
}

export async function setWindowContainerProperties(
  props: WindowContainerProperties
): Promise<void> {
  guardService(native() != null, PKG, 'setWindowContainerProperties');
  await wrapNativeCall(
    PKG,
    'setWindowContainerProperties',
    native()!.setWindowContainerProperties(props)
  );
}

export async function requestFullSpace(): Promise<void> {
  guardService(native() != null, PKG, 'requestFullSpace');
  await wrapNativeCall(PKG, 'requestFullSpace', native()!.requestFullSpace());
}

// ─── Eye gaze ────────────────────────────────────────────────────────────────

/**
 * Per-frame eye gaze updates, at vsync on hardware that supports it. On
 * unsupported devices the subscription is returned but never fires.
 */
export function addGazeListener(cb: (g: GazePose) => void): Subscription {
  return subscribe((h) => h.addGazeListener(cb));
}

/** One-shot gaze snapshot; null when eye gaze is unavailable. */
export async function getGazeSnapshot(): Promise<GazePose | null> {
  const hybrid = native();
  if (!hybrid?.eyeGazeAvailable) return null;
  return (await wrapNativeCall(PKG, 'getGazeSnapshot', hybrid.getGazeSnapshot())) ?? null;
}

export function isEyeGazeAvailable(): boolean {
  return native()?.eyeGazeAvailable ?? false;
}

// ─── Scene mesh ──────────────────────────────────────────────────────────────

/**
 * Current scene mesh. Native returns flat number arrays; they are normalised
 * here to Float32Array / Uint32Array.
 *
 * Rejects with SERVICE_UNAVAILABLE when the Spatial SDK is absent.
 */
export async function getSceneMesh(): Promise<SceneMesh> {
  guardService(native()?.sceneMeshAvailable ?? false, PKG, 'getSceneMesh');
  const raw = await wrapNativeCall(PKG, 'getSceneMesh', native()!.getSceneMesh());
  return toTypedMesh(raw);
}

/** Payload is normalised to typed arrays before the callback fires. */
export function addSceneMeshUpdateListener(cb: (m: SceneMesh) => void): Subscription {
  return subscribe((h) => h.addSceneMeshUpdateListener((raw) => cb(toTypedMesh(raw))));
}

export function isSceneMeshAvailable(): boolean {
  return native()?.sceneMeshAvailable ?? false;
}

// ─── Face tracking ───────────────────────────────────────────────────────────

/** Per-frame blendshape updates at vsync. Never fires on unsupported runtimes. */
export function addFaceListener(cb: (b: FaceBlendShapes) => void): Subscription {
  return subscribe((h) => h.addFaceListener(cb));
}

export function isFaceTrackingAvailable(): boolean {
  return native()?.faceTrackingAvailable ?? false;
}

// ─── Body tracking ───────────────────────────────────────────────────────────

/** Per-frame body joint updates at vsync. Never fires on unsupported runtimes. */
export function addBodyListener(cb: (joints: BodyJoint[]) => void): Subscription {
  return subscribe((h) =>
    h.addBodyListener((joints: SpatialBodyJoint[]) =>
      cb(
        joints.map((j) => ({
          name: j.name,
          position: [j.position.x, j.position.y, j.position.z] as [number, number, number],
          rotation: [j.rotation.x, j.rotation.y, j.rotation.z, j.rotation.w] as [
            number,
            number,
            number,
            number,
          ],
        }))
      )
    )
  );
}

export function isBodyTrackingAvailable(): boolean {
  return native()?.bodyTrackingAvailable ?? false;
}
