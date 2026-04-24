import ExpoPicoModule from './ExpoPicoModule';
import type {
  PicoAppType,
  PicoRuntimeInfo,
  PicoSpatialMode,
  PicoTargetProfileRuntime,
  PicoXRMode,
} from './types';

export type {
  PicoAppType,
  PicoRuntimeInfo,
  PicoSpatialMode,
  PicoTargetProfileRuntime,
  PicoXRMode,
  PicoPlatformSdkProbe,
  ExpoPicoModuleInterface,
} from './types';

export function isPicoBuild(): boolean {
  return ExpoPicoModule.isPicoBuild ?? false;
}

export function isPicoDevice(): boolean {
  return ExpoPicoModule.isPicoDevice ?? false;
}

export function getSpatialMode(): PicoSpatialMode {
  const mode = ExpoPicoModule.spatialMode;
  const valid: PicoSpatialMode[] = ['2d', 'windowed', 'shared-space', 'full-space', 'immersive', 'volume'];
  return valid.includes(mode as PicoSpatialMode) ? (mode as PicoSpatialMode) : '2d';
}

export function getPicoTargetProfile(): PicoTargetProfileRuntime {
  const profile = ExpoPicoModule.targetProfile;
  const valid: PicoTargetProfileRuntime[] = ['legacy', 'pico4', 'pico4ultra', 'swan', 'unknown'];
  return valid.includes(profile as PicoTargetProfileRuntime)
    ? (profile as PicoTargetProfileRuntime)
    : 'unknown';
}

/**
 * Returns the active PICO XR mode. Mirrors the plugin-time `xrMode` option
 * and the native `PicoXRPlatform` enum.
 */
export function getXrMode(): PicoXRMode {
  const mode = ExpoPicoModule.xrMode;
  if (mode === 'pico-os6' || mode === 'pico-swan') return mode;
  return 'mobile';
}

/** Convenience: `true` when the active runtime is Project Swan. */
export function isSwanRuntime(): boolean {
  return getXrMode() === 'pico-swan';
}

/** Returns the launcher contract app type (`vr` | `mr` | `2d`). */
export function getAppType(): PicoAppType {
  const t = ExpoPicoModule.appType;
  if (t === 'vr' || t === 'mr') return t;
  return '2d';
}

/**
 * True when the Platform SDK has enough identity resources to attempt
 * `CoreService.Initialize`. Sibling packages (expo-pico-account, etc.)
 * use this to short-circuit early before calling native init.
 */
export function hasPlatformIdentity(): boolean {
  return ExpoPicoModule.hasPlatformIdentity ?? false;
}

/**
 * True when both an IAP merchant ID and pay key are present (in either
 * region). `expo-pico-iap` uses this to gate the `getProducts` /
 * `purchase` surface.
 */
export function hasIapIdentity(): boolean {
  return ExpoPicoModule.hasIapIdentity ?? false;
}

/**
 * True when any PICO Platform SDK class resolves on the classpath at
 * runtime. Phase J reflection probe — safer than checking for a
 * specific class name because the broad probe covers every known
 * entry point (account, IAP, notifications, RTC, achievements,
 * leaderboards, rooms, social, storage, subscription).
 *
 * Sibling packages can short-circuit here before attempting their own
 * per-surface probe — if this is `false`, the real PICO Platform SDK
 * AAR is definitely not on the classpath and every sibling will
 * degrade to its SDK-unavailable path.
 */
export function isPlatformSdkPresent(): boolean {
  return ExpoPicoModule.platformSdkPresent ?? false;
}

/**
 * PICO Platform SDK version string read from
 * `com.pvr.platform.sdk.BuildConfig.VERSION_NAME` (and a few fallback
 * candidates). Returns `null` when the SDK is absent or the version
 * constant can't be read.
 */
export function getPlatformSdkVersion(): string | null {
  return ExpoPicoModule.platformSdkVersion ?? null;
}

/**
 * Fine-grained per-surface SDK probe report. Each entry names a
 * sibling-package domain (`account`, `iap`, `notifications`, ...) and
 * whether its specific SDK entry class resolves on the classpath.
 * Useful for diagnostics panels that want to show which siblings are
 * live vs stubbed.
 */
export async function getPlatformSdkProbe(): Promise<import('./types').PicoPlatformSdkProbe> {
  const native = (await ExpoPicoModule.getPlatformSdkProbe()) ?? {};
  // Native returns a plain map. Normalize to the typed shape with
  // explicit false fallbacks so consumers can destructure without
  // worrying about missing keys across SDK minor versions.
  const probe = native as Record<string, boolean>;
  return {
    account: probe.account ?? false,
    iap: probe.iap ?? false,
    achievements: probe.achievements ?? false,
    leaderboards: probe.leaderboards ?? false,
    rooms: probe.rooms ?? false,
    social: probe.social ?? false,
    storage: probe.storage ?? false,
    subscription: probe.subscription ?? false,
    notifications: probe.notifications ?? false,
    rtc: probe.rtc ?? false,
  };
}

export function getPicoRuntimeInfo(): PicoRuntimeInfo {
  return {
    isPicoBuild: isPicoBuild(),
    isPicoDevice: isPicoDevice(),
    spatialMode: getSpatialMode(),
    targetProfile: getPicoTargetProfile(),
    containerMode: (() => {
      const m = ExpoPicoModule.containerMode;
      if (m === 'window-container' || m === 'stage') return m;
      return 'none';
    })(),
    xrMode: getXrMode(),
    appType: getAppType(),
    picoAppId: ExpoPicoModule.picoAppId ?? null,
    picoAppKey: ExpoPicoModule.picoAppKey ?? null,
    hasPlatformIdentity: hasPlatformIdentity(),
    hasIapIdentity: hasIapIdentity(),
    picoOsVersion: ExpoPicoModule.picoOsVersion ?? null,
    deviceModel: ExpoPicoModule.deviceModel ?? null,
    emulatorOptimizations: ExpoPicoModule.emulatorOptimizations ?? false,
    swanRuntimeInitialized: ExpoPicoModule.swanRuntimeInitialized ?? false,
    os6RuntimeInitialized: ExpoPicoModule.os6RuntimeInitialized ?? false,
    platformSdkPresent: isPlatformSdkPresent(),
    platformSdkVersion: getPlatformSdkVersion(),
  };
}

// Phase F — runtime diagnostics.
export {
  getPicoDiagnostics,
  buildDiagnosticsReport,
  readBuildTimeFacts,
  readRuntimeFacts,
  formatDiagnostics,
} from './diagnostics';
export type { BuildTimeFacts, RuntimeFacts } from './diagnostics';
export type {
  DeclaredFeature,
  DeclaredPermission,
  DiagnosticFinding,
  DiagnosticSeverity,
  PicoDiagnosticsReport,
} from './types';

// Phase K — capability runtime surface (declared flags + per-capability
// async APIs covering display, tracking, spatial, controllers, sensors,
// and spatial audio).
export {
  capabilities,
  getDeclaredCapabilities,
  getDeclaredRefreshRates,
  getDeclaredTargetDevices,
  getCapabilitySnapshot,
  isCapabilityAvailable,
  display,
  eye,
  face,
  body,
  hand,
  boundary,
  scene,
  controllers,
  motionTracker,
  sensors,
  spatialAudio,
} from './capabilities';
export type {
  PicoBodyJoint,
  PicoCapabilityName,
  PicoCapabilitySnapshotEntry,
  PicoController,
  PicoDeclaredCapabilities,
  PicoDetectedPlane,
  PicoEyePose,
  PicoFoveationLevel,
  PicoHandPose,
  PicoHandPoseSide,
  PicoHighRateSensor,
  PicoMotionTracker,
} from './types';

export default ExpoPicoModule;
