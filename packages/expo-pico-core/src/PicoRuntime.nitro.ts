import type { HybridObject } from 'react-native-nitro-modules';

/**
 * XR display, tracking, spatial, controller and sensor surfaces.
 *
 * Tuple types from the Expo Modules surface are structs here — Nitro has no
 * tuple. `[number,number,number]` became PicoVec3, `[number,number,number,
 * number]` PicoQuat, `[number,number]` PicoExtent. Same data, named fields.
 *
 * Every `| null` became an optional. Callers that checked `=== null` need to
 * check `=== undefined`.
 */

export interface PicoVec3 {
  x: number;
  y: number;
  z: number;
}

export interface PicoQuat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface PicoExtent {
  width: number;
  height: number;
}

export type PicoFoveationLevel = 'off' | 'low' | 'medium' | 'high' | 'dynamic';
export type PicoHand = 'left' | 'right';
export type PicoControllerHand = 'left' | 'right' | 'unknown';
export type PicoTrackerAttachment = 'waist' | 'leftFoot' | 'rightFoot' | 'unknown';
export type PicoSensorType = 'accelerometer' | 'gyroscope' | 'magnetometer';

export interface PicoEyePose {
  leftGazeOrigin?: PicoVec3;
  leftGazeDirection?: PicoVec3;
  rightGazeOrigin?: PicoVec3;
  rightGazeDirection?: PicoVec3;
  leftOpenness?: number;
  rightOpenness?: number;
  leftPupilDiameterMm?: number;
  rightPupilDiameterMm?: number;
}

export interface PicoJoint {
  position: PicoVec3;
  rotation: PicoQuat;
}

export interface PicoBodyJoint {
  joint: string;
  position: PicoVec3;
  rotation: PicoQuat;
  confidence: number;
}

export interface PicoHandPoseSide {
  joints: PicoJoint[];
  confidence: number;
}

export interface PicoHandPose {
  leftHand?: PicoHandPoseSide;
  rightHand?: PicoHandPoseSide;
  aimEnabled: boolean;
}

export interface PicoDetectedPlane {
  id: string;
  /** 'floor' | 'wall' | 'ceiling' | 'table' | 'other', or a vendor value. */
  label: string;
  center: PicoVec3;
  extent: PicoExtent;
  normal: PicoVec3;
}

export interface PicoController {
  hand: PicoControllerHand;
  connected: boolean;
  batteryPct: number;
  model: string;
}

export interface PicoMotionTracker {
  id: string;
  attachment: PicoTrackerAttachment;
  connected: boolean;
  position: PicoVec3;
  rotation: PicoQuat;
  batteryPct: number;
}

export interface PicoHighRateSensor {
  type: PicoSensorType;
  vendor: string;
  name: string;
  maxHz: number;
  minDelayMicros: number;
}

export type PicoHapticHand = 'left' | 'right' | 'both';

/** Fired by the physical transparency dial on PICO 4 / 4 Ultra. */
export interface PassthroughLevelEvent {
  level: number;
  enabled: boolean;
}

export interface PicoRuntime extends HybridObject<{ android: 'kotlin' }> {
  getCurrentRefreshRate(): Promise<number | undefined>;
  getSupportedRefreshRates(): Promise<number[] | undefined>;
  setRefreshRate(hz: number): Promise<boolean>;
  getFoveationLevel(): Promise<PicoFoveationLevel | undefined>;
  setFoveationLevel(level: PicoFoveationLevel): Promise<boolean>;
  setPassthroughEnabled(enabled: boolean): Promise<boolean>;
  isPassthroughActive(): Promise<boolean | undefined>;

  enableEyeTracking(): Promise<boolean>;
  disableEyeTracking(): Promise<boolean>;
  getEyePose(): Promise<PicoEyePose | undefined>;
  enableFaceTracking(): Promise<boolean>;
  disableFaceTracking(): Promise<boolean>;
  /** Blendshape name -> weight. */
  getFaceWeights(): Promise<Record<string, number> | undefined>;
  enableBodyTracking(): Promise<boolean>;
  disableBodyTracking(): Promise<boolean>;
  getBodyJoints(): Promise<PicoBodyJoint[] | undefined>;
  enableHandTracking(): Promise<boolean>;
  disableHandTracking(): Promise<boolean>;
  getHandPose(): Promise<PicoHandPose | undefined>;

  isBoundaryVisible(): Promise<boolean | undefined>;
  setBoundaryVisible(visible: boolean): Promise<boolean>;
  /** Boundary polygon vertices; was number[][]. */
  getBoundaryGeometry(): Promise<PicoVec3[] | undefined>;
  refreshSceneMesh(): Promise<boolean>;
  getSceneMeshTriangleCount(): Promise<number | undefined>;
  getDetectedPlanes(): Promise<PicoDetectedPlane[] | undefined>;
  refreshScene(): Promise<boolean>;

  getControllers(): Promise<PicoController[] | undefined>;
  triggerHaptic(hand: PicoHand, amplitude: number, durationMs: number): Promise<boolean>;
  getMotionTrackers(): Promise<PicoMotionTracker[] | undefined>;

  getHighRateSensors(): Promise<PicoHighRateSensor[]>;
  isSpatialAudioEnabled(): Promise<boolean | undefined>;
  setSpatialAudioEnabled(enabled: boolean): Promise<boolean>;
  getHrtfProfile(): Promise<string | undefined>;

  // Formerly the separate ExpoPicoHaptics native module. Gated by the legacy
  // PVR AAR (PXR_Plugin) — the PPS Maven artifacts do not cover programmatic
  // haptics, so this is false on a Maven-only build even on PICO hardware.
  readonly hapticsAvailable: boolean;
  /** Accepts 'both'; triggerHaptic above is the per-hand PPS path. */
  pulseHaptic(hand: PicoHapticHand, amplitude: number, durationMs: number): Promise<void>;

  // Formerly the separate ExpoPicoPassthrough native module.
  readonly passthroughAvailable: boolean;
  /** level: 0.0 fully virtual - 1.0 fully real-world. */
  setPassthroughLevel(enabled: boolean, level: number): Promise<void>;
  addPassthroughDialListener(listener: (event: PassthroughLevelEvent) => void): number;
  removeListener(id: number): void;
}
