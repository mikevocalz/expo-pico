import {
  guardService,
  wrapNativeCall,
  resolveHybridObject,
  NULL_SUBSCRIPTION,
  type Subscription,
} from '@expo-pico/platform-service-common';

import { PicoSpatial, type SceneMeshRaw, type SpatialBodyJoint } from './PicoSpatial.nitro';
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

import { layoutReadinessFromProbe, type PicoSpatialLayoutBridgeStatus } from './layout';

const PKG = '@expo-pico/spatial';

const NO_CAPABILITIES: SpatialCapabilities = {
  spaceStates: false,
  spatialAnchors: false,
  sceneUnderstanding: false,
  passthrough: false,
  handTracking: false,
  spatialSdkAvailable: false,
};

function native(): PicoSpatial | null {
  return resolveHybridObject('PicoSpatial', () => new PicoSpatial());
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

/** Which SDK classes are linked, keyed by a stable name. Empty without native. */
export function getSpatialSdkProbe(): Record<string, boolean> {
  return native()?.getSpatialSdkProbe() ?? {};
}

/**
 * Status of the native WindowContainer bridge. Never throws: a missing or
 * outdated native module is reported through `reason`.
 */
export function getLayoutBridgeStatus(): PicoSpatialLayoutBridgeStatus {
  const hybrid = native();
  if (!hybrid) {
    return unboundStatus(
      'NATIVE_MODULE_UNAVAILABLE: the PicoSpatial HybridObject is not in this binary.'
    );
  }
  if (typeof hybrid.getLayoutBridgeStatus !== 'function') {
    return unboundStatus(
      'NATIVE_BRIDGE_OUTDATED: this binary predates getLayoutBridgeStatus. Rebuild the app.'
    );
  }
  const raw = hybrid.getLayoutBridgeStatus();
  return {
    sdkLinked: raw.sdkLinked === true,
    spatialPlatform: raw.spatialPlatform === true,
    reason: raw.reason ?? null,
    lastError: raw.lastError ?? null,
  };
}

export function getSpatialLayoutReadiness() {
  return layoutReadinessFromProbe(getSpatialSdkProbe(), getLayoutBridgeStatus());
}

function unboundStatus(reason: string): PicoSpatialLayoutBridgeStatus {
  return { sdkLinked: false, spatialPlatform: false, reason, lastError: null };
}

// ─── WindowContainers (PICO OS 6) ────────────────────────────────────────────

export interface WindowContainerOptions {
  /** Passed through to the SDK to tell apart containers that share an id. */
  tag?: string;
}

export type WindowContainerResult = { ok: true } | { ok: false; reason: string };

type WindowContainerCall = 'openWindowContainer' | 'closeWindowContainer';

function callWindowContainer(
  method: WindowContainerCall,
  id: string,
  options: WindowContainerOptions
): WindowContainerResult {
  if (typeof id !== 'string' || id.trim() === '') {
    return { ok: false, reason: 'INVALID_ID: id must be a non-empty string.' };
  }
  const status = getLayoutBridgeStatus();
  if (!status.sdkLinked || !status.spatialPlatform) {
    return { ok: false, reason: status.reason ?? 'BRIDGE_NOT_READY' };
  }
  const hybrid = native();
  if (!hybrid || typeof hybrid[method] !== 'function') {
    return { ok: false, reason: `NATIVE_BRIDGE_OUTDATED: this binary has no ${method}.` };
  }
  if (hybrid[method](id, options.tag) === true) return { ok: true };
  const after = getLayoutBridgeStatus();
  return {
    ok: false,
    reason:
      after.lastError ??
      `SDK_CALL_FAILED: ${method} returned false; see logcat tag ExpoPicoSpatial.`,
  };
}

/**
 * Opens a PICO OS 6 WindowContainer named `id` hosting the app's current
 * activity. On PICO OS 5, phones, or builds without the Spatial SDK
 * (`enableSpatialSdk`), returns `{ ok: false, reason }` and never throws.
 *
 * `ok: true` means the SDK call returned without throwing. The SDK gives no
 * completion signal, so it does not confirm the window is on screen yet.
 */
export function openWindowContainer(
  id: string,
  options: WindowContainerOptions = {}
): WindowContainerResult {
  return callWindowContainer('openWindowContainer', id, options);
}

/** Closes the WindowContainer opened with the same `id` and `tag`. */
export function closeWindowContainer(
  id: string,
  options: WindowContainerOptions = {}
): WindowContainerResult {
  return callWindowContainer('closeWindowContainer', id, options);
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
