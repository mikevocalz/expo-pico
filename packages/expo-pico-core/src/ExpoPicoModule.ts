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
  os6RuntimeInitialized: boolean;

  // Phase J — reflection-based PICO Platform SDK detection.
  platformSdkPresent: boolean;
  platformSdkVersion: string | null;

  // Phase K — prebuild-declared capability mirror.
  declaredCapabilities: PicoDeclaredCapabilities;
  declaredRefreshRates: number[];
  declaredTargetDevices: string[];

  // Phase F — async runtime introspection.
  hasSystemFeature(name: string): Promise<boolean>;
  getDeclaredFeatures(): Promise<Array<{ name: string; required: boolean; glEsVersion?: string }>>;
  getDeclaredPermissions(): Promise<Array<{ name: string; granted: boolean }>>;

  // Phase J — per-surface SDK probe report.
  getPlatformSdkProbe(): Promise<Record<string, boolean>>;

  // Phase K — capability runtime snapshot.
  getCapabilitySnapshot(): Promise<PicoCapabilitySnapshotEntry[]>;
  isCapabilityAvailable(name: PicoCapabilityName): Promise<boolean | null>;

  // Phase K — XR display.
  getCurrentRefreshRate(): Promise<number | null>;
  getSupportedRefreshRates(): Promise<number[] | null>;
  setRefreshRate(hz: number): Promise<boolean>;
  getFoveationLevel(): Promise<PicoFoveationLevel | null>;
  setFoveationLevel(level: PicoFoveationLevel): Promise<boolean>;
  setPassthroughEnabled(enabled: boolean): Promise<boolean>;
  isPassthroughActive(): Promise<boolean | null>;

  // Phase K — tracking.
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

  // Phase K — spatial.
  isBoundaryVisible(): Promise<boolean | null>;
  setBoundaryVisible(visible: boolean): Promise<boolean>;
  getBoundaryGeometry(): Promise<number[][] | null>;
  refreshSceneMesh(): Promise<boolean>;
  getSceneMeshTriangleCount(): Promise<number | null>;
  getDetectedPlanes(): Promise<PicoDetectedPlane[] | null>;
  refreshScene(): Promise<boolean>;

  // Phase K — controllers + haptics + motion tracker.
  getControllers(): Promise<PicoController[] | null>;
  triggerHaptic(hand: 'left' | 'right', amplitude: number, durationMs: number): Promise<boolean>;
  getMotionTrackers(): Promise<PicoMotionTracker[] | null>;

  // Phase K — sensors + spatial audio.
  getHighRateSensors(): Promise<PicoHighRateSensor[]>;
  isSpatialAudioEnabled(): Promise<boolean | null>;
  setSpatialAudioEnabled(enabled: boolean): Promise<boolean>;
  getHrtfProfile(): Promise<string | null>;
}

export default requireNativeModule<ExpoPicoModule>('ExpoPico');
