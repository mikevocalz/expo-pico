import { NativeModule, requireNativeModule } from 'expo';

import type {
  PicoCapabilityName,
  PicoCapabilitySnapshotEntry,
  PicoDeclaredCapabilities,
  PicoEyePose,
  PicoHandPose,
  PicoBodyJoint,
  PicoDetectedPlane,
  PicoController,
  PicoMotionTracker,
  PicoHighRateSensor,
  PicoFoveationLevel,
} from './types';

declare class ExpoPicoModule extends NativeModule {
  isPicoBuild: boolean;
  isPicoDevice: boolean;
  spatialMode: string;
  targetProfile: string;
  containerMode: string;
  xrMode: string;
  appType: string;
  picoAppId: string | null;
  picoAppKey: string | null;
  hasPlatformIdentity: boolean;
  hasIapIdentity: boolean;
  picoOsVersion: string | null;
  deviceModel: string | null;
  emulatorOptimizations: boolean;
  swanRuntimeInitialized: boolean;
  os5RuntimeInitialized: boolean;

  // Reflection-based PICO Platform SDK detection.
  platformSdkPresent: boolean;
  platformSdkVersion: string | null;

  // Prebuild-declared capability mirror.
  declaredCapabilities: PicoDeclaredCapabilities;
  declaredRefreshRates: number[];
  declaredTargetDevices: string[];

  // Async runtime introspection.
  hasSystemFeature(name: string): Promise<boolean>;
  getDeclaredFeatures(): Promise<Array<{ name: string; required: boolean; glEsVersion?: string }>>;
  getDeclaredPermissions(): Promise<Array<{ name: string; granted: boolean }>>;

  // Per-surface SDK probe report.
  getPlatformSdkProbe(): Promise<Record<string, boolean>>;

  // Capability runtime snapshot.
  getCapabilitySnapshot(): Promise<PicoCapabilitySnapshotEntry[]>;
  isCapabilityAvailable(name: PicoCapabilityName): Promise<boolean | null>;

  // XR display.
  getCurrentRefreshRate(): Promise<number | null>;
  getSupportedRefreshRates(): Promise<number[] | null>;
  setRefreshRate(hz: number): Promise<boolean>;
  getFoveationLevel(): Promise<PicoFoveationLevel | null>;
  setFoveationLevel(level: PicoFoveationLevel): Promise<boolean>;
  setPassthroughEnabled(enabled: boolean): Promise<boolean>;
  isPassthroughActive(): Promise<boolean | null>;

  // Tracking.
  enableEyeTracking(): Promise<boolean>;
  disableEyeTracking(): Promise<boolean>;
  getEyePose(): Promise<PicoEyePose | null>;
  enableFaceTracking(): Promise<boolean>;
  disableFaceTracking(): Promise<boolean>;
  getFaceWeights(): Promise<Record<string, number> | null>;
  enableBodyTracking(): Promise<boolean>;
  disableBodyTracking(): Promise<boolean>;
  getBodyJoints(): Promise<PicoBodyJoint[] | null>;
  enableHandTracking(): Promise<boolean>;
  disableHandTracking(): Promise<boolean>;
  getHandPose(): Promise<PicoHandPose | null>;

  // Spatial.
  isBoundaryVisible(): Promise<boolean | null>;
  setBoundaryVisible(visible: boolean): Promise<boolean>;
  getBoundaryGeometry(): Promise<number[][] | null>;
  refreshSceneMesh(): Promise<boolean>;
  getSceneMeshTriangleCount(): Promise<number | null>;
  getDetectedPlanes(): Promise<PicoDetectedPlane[] | null>;
  refreshScene(): Promise<boolean>;

  // Controllers + haptics + motion tracker.
  getControllers(): Promise<PicoController[] | null>;
  triggerHaptic(hand: 'left' | 'right', amplitude: number, durationMs: number): Promise<boolean>;
  getMotionTrackers(): Promise<PicoMotionTracker[] | null>;

  // Sensors + spatial audio.
  getHighRateSensors(): Promise<PicoHighRateSensor[]>;
  isSpatialAudioEnabled(): Promise<boolean | null>;
  setSpatialAudioEnabled(enabled: boolean): Promise<boolean>;
  getHrtfProfile(): Promise<string | null>;
}

export default requireNativeModule<ExpoPicoModule>('ExpoPico');
