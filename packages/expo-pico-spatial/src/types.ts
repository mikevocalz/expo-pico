/**
 * Space state — the top-level context the app is running in.
 * Aligned with PICO OS 6 Spatial SDK spatial container model.
 *
 * @see https://developer.picoxr.com/document/spatial-sdk/learn-about-spatial-containers-and-space-states/
 */
export type PicoSpaceState = 'shared-space' | 'full-space' | 'unknown';

/**
 * Container type for spatial content within a space state.
 * - 'window-container': A 2D panel floating in space (WindowContainer)
 * - 'stage': A 3D stage that hosts immersive content (Stage)
 *
 * @see https://developer.picoxr.com/document/spatial-sdk/set-properties-for-window-containers/
 * @see https://developer.picoxr.com/document/spatial-sdk/open-or-close-stages
 */
export type PicoContainerType = 'window-container' | 'stage' | 'none';

/**
 * Spatial anchor handle — an opaque reference returned by createSpatialAnchor.
 * The actual anchor is managed by the PICO Spatial SDK on the native side.
 *
 * Extension seam: when the PICO Spatial SDK Kotlin bindings are stable and
 * publicly documented with a concrete Expo Module API, this will be replaced
 * by a proper native handle type.
 *
 * @see https://developer.picoxr.com/document/spatial-sdk/spatial-anchor
 */
export interface SpatialAnchorHandle {
  /** Opaque anchor ID string returned by the PICO Spatial SDK. */
  anchorId: string;
  /** Whether this anchor has been persisted across sessions. */
  persisted: boolean;
}

/**
 * 3D pose — position + orientation.
 */
export interface SpatialPose {
  position: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number; w: number };
}

/**
 * Spatial capability flags available at runtime.
 * These reflect what the current device + OS version can do.
 */
export interface SpatialCapabilities {
  /** Whether the device supports Shared Space / Full Space APIs. */
  spaceStates: boolean;
  /** Whether spatial anchors are supported. */
  spatialAnchors: boolean;
  /** Whether scene understanding (plane/mesh detection) is supported. */
  sceneUnderstanding: boolean;
  /** Whether video passthrough / mixed reality is available. */
  passthrough: boolean;
  /** Whether hand tracking hardware is present. */
  handTracking: boolean;
  /**
   * Whether the Spatial SDK runtime is available on this device.
   * Will be false on pre-OS6 PICO devices and non-PICO devices.
   *
   * Extension seam: actual Spatial SDK availability check requires
   * PICO Spatial SDK bindings. Until those bindings are publicly
   * documented with a stable API, this returns false on all devices.
   */
  spatialSdkAvailable: boolean;
}

/**
 * WindowContainer properties that can be set before opening.
 * Subset of properties documented at:
 * @see https://developer.picoxr.com/document/spatial-sdk/set-properties-for-window-containers/
 */
export interface WindowContainerProperties {
  width?: number;
  height?: number;
  /** Depth offset from the default spawn position, in meters. */
  depthOffset?: number;
  resizable?: boolean;
}

export interface ExpoPicoSpatialModuleInterface {
  spaceState: string;
  containerType: string;
  spatialSdkVersion: string | null;
  capabilities: {
    spaceStates: boolean;
    spatialAnchors: boolean;
    sceneUnderstanding: boolean;
    passthrough: boolean;
    handTracking: boolean;
    spatialSdkAvailable: boolean;
  };
  getSpatialSdkProbe(): Promise<Record<string, boolean>>;
  createSpatialAnchor(pose: SpatialPose): Promise<{
    id: string;
    anchorId: string;
    persisted: boolean;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
  }>;
  setWindowContainerProperties(props: WindowContainerProperties): Promise<void>;
  requestFullSpace(): Promise<void>;
}

/**
 * Eye gaze types.
 */
export interface GazePose {
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  valid: boolean;
}

export interface ExpoPicoEyeGazeModuleInterface {
  eyeGazeAvailable: boolean;
  getGazeSnapshot(): Promise<GazePose | null>;
  isEyeGazeAvailable(): boolean;
}

/**
 * Scene mesh types.
 *
 * Native returns plain number arrays; JS normalizes to TypedArrays.
 */
export interface SceneMesh {
  vertices: Float32Array;
  indices: Uint32Array;
  normals?: Float32Array;
}

export interface SceneMeshRaw {
  vertices: number[];
  indices: number[];
  normals?: number[];
}

export interface ExpoPicoSceneMeshModuleInterface {
  sceneMeshAvailable: boolean;
  getSceneMesh(): Promise<SceneMeshRaw>;
  isSceneMeshAvailable(): boolean;
}

/**
 * Face tracking types.
 */
export type FaceBlendShapes = Record<string, number>;

export interface ExpoPicoFaceTrackingModuleInterface {
  faceTrackingAvailable: boolean;
  isFaceTrackingAvailable(): boolean;
}

/**
 * Body tracking types.
 */
export interface BodyJoint {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
}

export interface ExpoPicoBodyTrackingModuleInterface {
  bodyTrackingAvailable: boolean;
  isBodyTrackingAvailable(): boolean;
}
