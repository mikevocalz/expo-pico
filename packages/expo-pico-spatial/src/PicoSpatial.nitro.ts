import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Consolidates the five Expo Modules natives this package used to resolve
 * separately: ExpoPicoSpatial, ExpoPicoEyeGaze, ExpoPicoSceneMesh,
 * ExpoPicoFaceTracking and ExpoPicoBodyTracking. Availability stayed
 * per-surface, so each keeps its own `*Available` flag.
 *
 * Still Kotlin over the legacy PVR Spatial SDK AAR — a faithful port of the
 * current implementation. Moving these surfaces onto OpenXR extensions in C++
 * is a separate rewrite, and the one that would drop the proprietary
 * pico-spatial-sdk.aar requirement.
 */

export type PicoSpaceState = 'shared-space' | 'full-space' | 'unknown';
export type PicoContainerType = 'window-container' | 'stage' | 'none';

export interface SpatialVec3 {
  x: number;
  y: number;
  z: number;
}

export interface SpatialQuat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface SpatialPose {
  position: SpatialVec3;
  orientation: SpatialQuat;
}

export interface SpatialAnchorResult {
  id: string;
  anchorId: string;
  persisted: boolean;
  position: SpatialVec3;
  rotation: SpatialQuat;
}

export interface SpatialCapabilities {
  spaceStates: boolean;
  spatialAnchors: boolean;
  sceneUnderstanding: boolean;
  passthrough: boolean;
  handTracking: boolean;
  /** False on pre-OS6 PICO devices and everything non-PICO. */
  spatialSdkAvailable: boolean;
}

export interface WindowContainerProperties {
  width?: number;
  height?: number;
  /** Depth offset from the default spawn position, in metres. */
  depthOffset?: number;
  resizable?: boolean;
}

export interface GazePose {
  position: SpatialVec3;
  direction: SpatialVec3;
  valid: boolean;
}

/**
 * Flat vertex/index buffers. The TS layer normalises these into Float32Array
 * and Uint32Array. Nitro can carry ArrayBuffer directly, which would make this
 * zero-copy — worth doing once the surface is otherwise stable.
 */
export interface SceneMeshRaw {
  vertices: number[];
  indices: number[];
  normals?: number[];
}

export interface SpatialBodyJoint {
  name: string;
  position: SpatialVec3;
  rotation: SpatialQuat;
}

export interface PicoSpatial extends HybridObject<{ android: 'kotlin' }> {
  // ── Space state + containers ──────────────────────────────────────────────
  readonly spaceState: PicoSpaceState;
  readonly containerType: PicoContainerType;
  readonly spatialSdkVersion?: string;
  readonly capabilities: SpatialCapabilities;

  getSpatialSdkProbe(): Promise<Record<string, boolean>>;
  createSpatialAnchor(pose: SpatialPose): Promise<SpatialAnchorResult>;
  setWindowContainerProperties(props: WindowContainerProperties): Promise<void>;
  requestFullSpace(): Promise<void>;

  // ── Eye gaze ──────────────────────────────────────────────────────────────
  readonly eyeGazeAvailable: boolean;
  getGazeSnapshot(): Promise<GazePose | undefined>;
  addGazeListener(listener: (gaze: GazePose) => void): number;

  // ── Scene mesh ────────────────────────────────────────────────────────────
  readonly sceneMeshAvailable: boolean;
  getSceneMesh(): Promise<SceneMeshRaw>;
  addSceneMeshUpdateListener(listener: (mesh: SceneMeshRaw) => void): number;

  // ── Face tracking ─────────────────────────────────────────────────────────
  readonly faceTrackingAvailable: boolean;
  /** Blendshape name -> weight. */
  addFaceListener(listener: (blendShapes: Record<string, number>) => void): number;

  // ── Body tracking ─────────────────────────────────────────────────────────
  readonly bodyTrackingAvailable: boolean;
  addBodyListener(listener: (joints: SpatialBodyJoint[]) => void): number;

  removeListener(id: number): void;
}
