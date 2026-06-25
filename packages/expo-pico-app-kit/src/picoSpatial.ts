// Pico Spatial SDK wrapper — window container resize, eye gaze, scene
// mesh, face tracking, body tracking. These ride the legacy PVR-prefixed
// Spatial SDK 1.x AAR (`com.pvr.spatial:spatial-sdk:1.0.0`), which is
// NOT on public Maven — distinct from the modern PPS artifacts that
// expo-pico-core resolves automatically. Each helper degrades gracefully
// when the legacy Spatial SDK AAR isn't on the classpath: listeners stay
// quiet, snapshot getters return null, async calls resolve to false.

import { getPicoCapabilities } from './picoCapabilities';

export type Subscription = { remove: () => void };

const NULL_SUB: Subscription = { remove: () => {} };

let spatialModuleCache: any | null | undefined;

function spatial(): any | null {
  if (spatialModuleCache !== undefined) return spatialModuleCache;
  try {
    spatialModuleCache = require('@expo-pico/spatial');
  } catch {
    spatialModuleCache = null;
  }
  return spatialModuleCache;
}

let warnedTable: Record<string, boolean> = {};
function warnOnce(feature: string, reason: string) {
  if (warnedTable[feature]) return;
  warnedTable[feature] = true;
  // eslint-disable-next-line no-console
  console.warn(`[pico/spatial] ${feature}: ${reason}`);
}

// ───────── Window container ─────────

export type WindowProperties = {
  width?: number;       // dp
  height?: number;      // dp
  minWidth?: number;
  minHeight?: number;
  distanceM?: number;
  userResizable?: boolean;
};

export async function setWindowContainerProperties(
  props: WindowProperties,
): Promise<boolean> {
  if (!getPicoCapabilities().windowContainer) {
    warnOnce(
      'windowContainer',
      'Spatial SDK AAR not on classpath. Manifest <layout> defaults apply on first install; subsequent launches use Pico spatial-container cache. Drop pico-spatial-sdk-*.aar into android/app/libs/ to enable runtime resize.',
    );
    return false;
  }
  try {
    const s = spatial();
    await s.setWindowContainerProperties?.(props);
    return true;
  } catch {
    return false;
  }
}

// ───────── Eye gaze ─────────

export type GazePose = {
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  valid: boolean;
};

export function onGaze(cb: (g: GazePose) => void): Subscription {
  if (!getPicoCapabilities().eyeGaze) {
    warnOnce(
      'eyeGaze',
      'Spatial SDK AAR not on classpath — no gaze data will arrive.',
    );
    return NULL_SUB;
  }
  try {
    const s = spatial();
    const sub = s.addGazeListener?.(cb);
    return sub && typeof sub.remove === 'function' ? sub : NULL_SUB;
  } catch {
    return NULL_SUB;
  }
}

export function getGazeSnapshot(): GazePose | null {
  if (!getPicoCapabilities().eyeGaze) return null;
  try {
    return spatial()?.getGazeSnapshot?.() ?? null;
  } catch {
    return null;
  }
}

// ───────── Scene mesh ─────────

export type SceneMesh = {
  vertices: number[] | Float32Array;
  indices: number[] | Uint32Array;
  normals?: number[] | Float32Array;
};

export async function getSceneMesh(): Promise<SceneMesh | null> {
  if (!getPicoCapabilities().sceneMesh) {
    warnOnce(
      'sceneMesh',
      'Spatial SDK AAR not on classpath — room mesh unavailable.',
    );
    return null;
  }
  try {
    return (await spatial()?.getSceneMesh?.()) ?? null;
  } catch {
    return null;
  }
}

export function onSceneMeshUpdate(cb: (m: SceneMesh) => void): Subscription {
  if (!getPicoCapabilities().sceneMesh) return NULL_SUB;
  try {
    const sub = spatial()?.addSceneMeshUpdateListener?.(cb);
    return sub && typeof sub.remove === 'function' ? sub : NULL_SUB;
  } catch {
    return NULL_SUB;
  }
}

// ───────── Face tracking ─────────

export type FaceBlendShapes = Record<string, number>;

export function onFace(cb: (b: FaceBlendShapes) => void): Subscription {
  if (!getPicoCapabilities().faceTracking) {
    warnOnce(
      'faceTracking',
      'Spatial SDK AAR not on classpath — face blendshapes unavailable.',
    );
    return NULL_SUB;
  }
  try {
    const sub = spatial()?.addFaceListener?.(cb);
    return sub && typeof sub.remove === 'function' ? sub : NULL_SUB;
  } catch {
    return NULL_SUB;
  }
}

// ───────── Body tracking ─────────

export type BodyJoint = {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
};

export function onBody(cb: (joints: BodyJoint[]) => void): Subscription {
  if (!getPicoCapabilities().bodyTracking) {
    warnOnce(
      'bodyTracking',
      'Spatial SDK AAR not on classpath — body pose unavailable.',
    );
    return NULL_SUB;
  }
  try {
    const sub = spatial()?.addBodyListener?.(cb);
    return sub && typeof sub.remove === 'function' ? sub : NULL_SUB;
  } catch {
    return NULL_SUB;
  }
}

// ───────── Space transitions ─────────

export async function requestFullSpace(): Promise<boolean> {
  if (!getPicoCapabilities().windowContainer) return false;
  try {
    await spatial()?.requestFullSpace?.();
    return true;
  } catch {
    return false;
  }
}

// ───────── Anchors ─────────

export type AnchorPose = {
  position: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number; w: number };
};

export type SpatialAnchor = {
  id: string;
  position: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number; w: number };
};

export async function createAnchor(pose: AnchorPose): Promise<SpatialAnchor | null> {
  if (!getPicoCapabilities().windowContainer) return null;
  try {
    const result = await spatial()?.createSpatialAnchor?.(pose);
    return result ?? null;
  } catch {
    return null;
  }
}
