import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Build identity, prebuild-declared config, and SDK/capability probing.
 * XR runtime surfaces live in PicoRuntime.
 */

export type PicoXRMode = 'mobile' | 'pico-os5' | 'pico-swan';
export type PicoAppType = 'vr' | 'mr' | '2d';
export type PicoTargetProfile = 'legacy' | 'pico4' | 'pico4ultra' | 'swan' | 'unknown';

export type PicoCapabilityName =
  | 'handTracking'
  | 'passthrough'
  | 'sceneUnderstanding'
  | 'eyeTracking'
  | 'faceTracking'
  | 'bodyTracking'
  | 'spatialAudio'
  | 'foveatedRendering'
  | 'highSamplingRateSensors'
  | 'boundary'
  | 'sceneMesh'
  | 'picoSenseController'
  | 'motionTracker'
  | 'controllerHaptics'
  | 'openXrLoader'
  | 'developerTools'
  | 'entitlementCheck';

/** Mirror of the capability flags set at prebuild. */
export interface PicoDeclaredCapabilities {
  handTracking: boolean;
  passthrough: boolean;
  sceneUnderstanding: boolean;
  eyeTracking: boolean;
  faceTracking: boolean;
  bodyTracking: boolean;
  spatialAudio: boolean;
  foveatedRendering: boolean;
  highSamplingRateSensors: boolean;
  boundary: boolean;
  sceneMesh: boolean;
  picoSenseController: boolean;
  motionTracker: boolean;
  controllerHaptics: boolean;
  openXrLoader: boolean;
  ndkAbiFilters: boolean;
  developerTools: boolean;
  entitlementCheck: boolean;
}

/**
 * Three-layer capability check. `fullyAvailable` is the only one callers
 * should gate on; the rest explain why it is false.
 */
export interface PicoCapabilitySnapshotEntry {
  name: PicoCapabilityName;
  declared: boolean;
  systemFeature?: string;
  systemFeatureAvailable?: boolean;
  sdkClassFound?: string;
  sdkAvailable: boolean;
  fullyAvailable: boolean;
}

export interface PicoDeclaredFeature {
  name: string;
  required: boolean;
  glEsVersion?: string;
}

export interface PicoDeclaredPermission {
  name: string;
  granted: boolean;
}

export interface PicoCore extends HybridObject<{ android: 'kotlin' }> {
  readonly isPicoBuild: boolean;
  readonly isPicoDevice: boolean;
  readonly spatialMode: string;
  readonly containerMode: string;
  readonly targetProfile: PicoTargetProfile;
  readonly xrMode: PicoXRMode;
  readonly appType: PicoAppType;

  readonly picoAppId?: string;
  readonly picoAppKey?: string;
  readonly hasPlatformIdentity: boolean;
  readonly hasIapIdentity: boolean;

  readonly picoOsVersion?: string;
  readonly deviceModel?: string;
  readonly emulatorOptimizations: boolean;
  readonly swanRuntimeInitialized: boolean;
  readonly os5RuntimeInitialized: boolean;

  readonly platformSdkPresent: boolean;
  readonly platformSdkVersion?: string;

  readonly declaredCapabilities: PicoDeclaredCapabilities;
  readonly declaredRefreshRates: number[];
  readonly declaredTargetDevices: string[];

  hasSystemFeature(name: string): Promise<boolean>;
  getDeclaredFeatures(): Promise<PicoDeclaredFeature[]>;
  getDeclaredPermissions(): Promise<PicoDeclaredPermission[]>;

  /** Per-surface reflection probe: SDK class name -> resolved on classpath. */
  getPlatformSdkProbe(): Promise<Record<string, boolean>>;

  getCapabilitySnapshot(): Promise<PicoCapabilitySnapshotEntry[]>;
  /** Undefined when the capability has no system-feature key to check. */
  isCapabilityAvailable(name: PicoCapabilityName): Promise<boolean | undefined>;
}
