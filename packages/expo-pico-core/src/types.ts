export type PicoSpatialMode =
  | '2d'
  | 'windowed'
  | 'shared-space'
  | 'full-space'
  | 'immersive'
  | 'volume';

export type PicoTargetProfileRuntime =
  | 'legacy'
  | 'pico4'
  | 'pico4ultra'
  | 'swan'
  | 'unknown';

/**
 * Active PICO XR platform mode (runtime view of the plugin-time `xrMode`
 * option). Mirrors the native `PicoXRPlatform` enum.
 *   - `mobile`:    Standard Android; no PICO runtime registered.
 *   - `pico-os6`:  Standard PICO OS 6 runtime active.
 *   - `pico-swan`: Project Swan / next-gen spatial runtime active.
 */
export type PicoXRMode = 'mobile' | 'pico-os6' | 'pico-swan';

export type PicoAppType = 'vr' | 'mr' | '2d';

export interface PicoRuntimeInfo {
  isPicoBuild: boolean;
  isPicoDevice: boolean;
  spatialMode: PicoSpatialMode;
  targetProfile: PicoTargetProfileRuntime;
  containerMode: 'window-container' | 'stage' | 'none';
  xrMode: PicoXRMode;
  appType: PicoAppType;
  picoAppId: string | null;
  picoAppKey: string | null;
  /** True when `platformService.picoAppId` or `picoAppKey` (or their foreign siblings) is set. */
  hasPlatformIdentity: boolean;
  /** True when both `picoMerchantId` and `picoPayKey` are set (one region is enough). */
  hasIapIdentity: boolean;
  picoOsVersion: string | null;
  deviceModel: string | null;
  emulatorOptimizations: boolean;
  swanRuntimeInitialized: boolean;
  os6RuntimeInitialized: boolean;
  /** True when any PICO Platform SDK class resolves on the runtime classpath. */
  platformSdkPresent: boolean;
  /** SDK version read from `com.pvr.platform.sdk.BuildConfig.VERSION_NAME`, or null. */
  platformSdkVersion: string | null;
}

/**
 * Fine-grained per-surface PICO Platform SDK probe report. Each key is
 * a sibling-package domain (`account`, `iap`, ...); values are `true`
 * when the corresponding SDK class resolves on the classpath.
 */
export type PicoPlatformSdkProbe = Record<
  | 'account'
  | 'iap'
  | 'achievements'
  | 'leaderboards'
  | 'rooms'
  | 'social'
  | 'storage'
  | 'subscription'
  | 'notifications'
  | 'rtc',
  boolean
>;

export interface ExpoPicoModuleInterface {
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
  platformSdkPresent: boolean;
  platformSdkVersion: string | null;
  declaredCapabilities: PicoDeclaredCapabilities;
  declaredRefreshRates: number[];
  declaredTargetDevices: string[];
  hasSystemFeature(name: string): Promise<boolean>;
  getDeclaredFeatures(): Promise<DeclaredFeature[]>;
  getDeclaredPermissions(): Promise<DeclaredPermission[]>;
  getPlatformSdkProbe(): Promise<PicoPlatformSdkProbe>;
  getCapabilitySnapshot(): Promise<PicoCapabilitySnapshotEntry[]>;
  isCapabilityAvailable(name: PicoCapabilityName): Promise<boolean | null>;
}

export interface DeclaredFeature {
  name: string;
  required: boolean;
  glEsVersion?: string;
}

export interface DeclaredPermission {
  name: string;
  granted: boolean;
}

/**
 * Severity of a diagnostic finding. `ok` means the check passed;
 * `info` is an informational note; `warning` is a likely misconfig that
 * will still run; `error` is a state that will definitely fail at
 * runtime.
 */
export type DiagnosticSeverity = 'ok' | 'info' | 'warning' | 'error';

export interface DiagnosticFinding {
  /** Stable identifier — safe to branch on in code. */
  id: string;
  severity: DiagnosticSeverity;
  /** One-line human-readable summary. */
  message: string;
  /** Optional remediation hint. */
  hint?: string;
}

export interface PicoDiagnosticsReport {
  /** Summary booleans derived from the findings. */
  summary: {
    hasError: boolean;
    hasWarning: boolean;
    declaredFeatureCount: number;
    declaredPermissionCount: number;
    missingSystemFeatureCount: number;
  };
  /** Detail — ordered by severity then id. */
  findings: DiagnosticFinding[];
  /** Raw PackageManager output so consumers can build their own views. */
  raw: {
    declaredFeatures: DeclaredFeature[];
    declaredPermissions: DeclaredPermission[];
    systemFeatureHits: Record<string, boolean>;
  };
}

// ─── Phase K: per-capability runtime surface ─────────────────────────

/**
 * Stable names for every PICO capability the plugin can declare. Matches
 * `PicoCapabilityOptions` keys on the plugin side.
 */
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

/** Read-only mirror of the prebuild-declared capability flags. */
export type PicoDeclaredCapabilities = {
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
};

/**
 * Per-capability three-layer snapshot:
 *   - `declared`:               was it flipped on at prebuild?
 *   - `systemFeatureAvailable`: does the device report it? (null when no feature key)
 *   - `sdkAvailable`:           did a PICO SDK class resolve on the classpath?
 *   - `fullyAvailable`:         all three green — safe to use the runtime API.
 */
export interface PicoCapabilitySnapshotEntry {
  name: PicoCapabilityName;
  declared: boolean;
  systemFeature: string | null;
  systemFeatureAvailable: boolean | null;
  sdkClassFound: string | null;
  sdkAvailable: boolean;
  fullyAvailable: boolean;
}

export type PicoFoveationLevel =
  | 'off'
  | 'low'
  | 'medium'
  | 'high'
  | 'dynamic';

export interface PicoEyePose {
  leftGazeOrigin: [number, number, number] | null;
  leftGazeDirection: [number, number, number] | null;
  rightGazeOrigin: [number, number, number] | null;
  rightGazeDirection: [number, number, number] | null;
  leftOpenness: number | null;
  rightOpenness: number | null;
  leftPupilDiameterMm: number | null;
  rightPupilDiameterMm: number | null;
}

export interface PicoBodyJoint {
  joint: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  confidence: number;
}

export interface PicoHandPoseSide {
  joints: Array<{
    position: [number, number, number];
    rotation: [number, number, number, number];
  }>;
  confidence: number;
}

export interface PicoHandPose {
  leftHand: PicoHandPoseSide | null;
  rightHand: PicoHandPoseSide | null;
  aimEnabled: boolean;
}

export interface PicoDetectedPlane {
  id: string;
  label: 'floor' | 'wall' | 'ceiling' | 'table' | 'other' | string;
  center: [number, number, number];
  extent: [number, number];
  normal: [number, number, number];
}

export interface PicoController {
  hand: 'left' | 'right' | 'unknown';
  connected: boolean;
  batteryPct: number;
  model: string;
}

export interface PicoMotionTracker {
  id: string;
  attachment: 'waist' | 'leftFoot' | 'rightFoot' | 'unknown';
  connected: boolean;
  position: [number, number, number];
  rotation: [number, number, number, number];
  batteryPct: number;
}

export interface PicoHighRateSensor {
  type: 'accelerometer' | 'gyroscope' | 'magnetometer';
  vendor: string;
  name: string;
  maxHz: number;
  minDelayMicros: number;
}
