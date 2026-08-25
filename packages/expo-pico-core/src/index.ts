import {
  resolveHybridObject,
  NULL_SUBSCRIPTION,
  type Subscription,
} from '@expo-pico/platform-service-common';

import type { PicoRuntime } from './PicoRuntime.nitro';

import ExpoPicoModule from './ExpoPicoModule';
import type {
  PicoAppType,
  PicoRuntimeInfo,
  PicoSpatialMode,
  PicoTargetProfileRuntime,
  PicoXRMode,
  HapticHand,
  PassthroughLevelEvent,
} from './types';

export type {
  PicoAppType,
  PicoRuntimeInfo,
  PicoSpatialMode,
  PicoTargetProfileRuntime,
  PicoXRMode,
  HapticHand,
  PicoPlatformSdkProbe,
  ExpoPicoModuleInterface,
  PassthroughLevelEvent,
} from './types';

export type { Subscription };

// ─── Controller haptics + passthrough dial ──────────────────────────────────
// Both were separate native modules under Expo Modules (ExpoPicoHaptics,
// ExpoPicoPassthrough). They are members of the PicoRuntime HybridObject now;
// the exported functions below are unchanged.

function runtime(): PicoRuntime | null {
  return resolveHybridObject<PicoRuntime>('PicoRuntime');
}

/**
 * Triggers a haptic pulse on the specified controller.
 *
 * @param hand       'left' | 'right' | 'both'
 * @param amplitude  vibration strength, clamped to 0.0-1.0
 * @param durationMs duration in milliseconds, must be > 0
 *
 * Rejects with SERVICE_UNAVAILABLE when the haptics surface is absent, and
 * with VALIDATION_ERROR for invalid inputs.
 */
export async function pulseHaptic(
  hand: HapticHand,
  amplitude: number,
  durationMs: number
): Promise<void> {
  const r = runtime();
  if (!r?.hapticsAvailable) {
    throw new Error('ExpoPicoHaptics surface not available');
  }
  return r.pulseHaptic(hand, amplitude, durationMs);
}

/**
 * True when the haptics surface is wired at runtime. Note this is one of the
 * few surfaces still gated by the legacy PVR AAR (PXR_Plugin); the modern PPS
 * Maven artifacts do not cover programmatic haptics.
 */
export function isHapticsAvailable(): boolean {
  return runtime()?.hapticsAvailable ?? false;
}

/**
 * Adds a listener for physical PICO passthrough dial events.
 *
 * On PICO 4 / PICO 4 Ultra the hardware transparency dial fires this callback
 * whenever the user turns it, with `{ level: 0.0-1.0, enabled: boolean }`.
 * Drive a `passthroughTransparency` prop from `level`. Inert on non-PICO
 * devices — the subscription returns but never fires.
 */
export function addPassthroughDialListener(
  cb: (event: PassthroughLevelEvent) => void
): Subscription {
  const r = runtime();
  if (!r?.passthroughAvailable) return NULL_SUBSCRIPTION;
  const id = r.addPassthroughDialListener(cb);
  return { remove: () => r.removeListener(id) };
}

/**
 * Programmatically enable/disable passthrough and set the transparency level.
 *
 * @param enabled true = show the real-world background
 * @param level   0.0 fully virtual - 1.0 fully real-world. Defaults to 1.
 *
 * Rejects with SERVICE_UNAVAILABLE when PXR_Plugin is not present.
 */
export async function setPassthrough(enabled: boolean, level = 1.0): Promise<void> {
  const r = runtime();
  if (!r?.passthroughAvailable) {
    throw new Error('ExpoPicoPassthrough surface not available');
  }
  return r.setPassthroughLevel(enabled, level);
}

/** True when the passthrough surface is wired at runtime. */
export function isPassthroughAvailable(): boolean {
  return runtime()?.passthroughAvailable ?? false;
}

export function isPicoBuild(): boolean {
  return ExpoPicoModule.isPicoBuild ?? false;
}

export function isPicoDevice(): boolean {
  return ExpoPicoModule.isPicoDevice ?? false;
}

export function getSpatialMode(): PicoSpatialMode {
  const mode = ExpoPicoModule.spatialMode;
  const valid: PicoSpatialMode[] = [
    '2d',
    'windowed',
    'shared-space',
    'full-space',
    'immersive',
    'volume',
  ];
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
  if (mode === 'pico-os5' || mode === 'pico-swan') return mode;
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
 * runtime. Reflection probe — safer than checking for a
 * specific class name because the broad probe covers every known
 * entry point (account, IAP, notifications, RTC, achievements,
 * leaderboards, rooms, social, storage, subscription).
 *
 * Sibling packages can short-circuit here before attempting their own
 * per-surface probe — if this is `false`, no PICO Platform SDK
 * surface resolves on the classpath (PPS Maven deps didn't resolve at
 * build time and no legacy PVR AAR was dropped in), so every sibling
 * will degrade to its SDK-unavailable path.
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
    os5RuntimeInitialized: ExpoPicoModule.os5RuntimeInitialized ?? false,
    platformSdkPresent: isPlatformSdkPresent(),
    platformSdkVersion: getPlatformSdkVersion(),
  };
}

// Runtime diagnostics.
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

// Capability runtime surface (declared flags + per-capability
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

// ─── Location (expo-location wrapper) ───────────────────────────────────────
// PICO OS is Android-based, so stock expo-location works on device. Exposed
// here so PICO apps get a permission-aware getPicoLocation() from the library.
export { getPicoLocation, requestLocationPermission, isLocationAvailable } from './location';
export type { PicoCoordinates } from './location';

export default ExpoPicoModule;

/**
 * Hand the display to this app's immersive activity.
 *
 * PICO starts every app as a flat 2D panel. A renderer drawing inside that
 * panel stays inside it — which is why an "XR scene" rendered inline still
 * shows the panel floating in the environment. Exclusive display requires a
 * separate Activity carrying PICO's VR intent category; `@expo-pico/core`'s
 * plugin writes that onto `.VRActivity`.
 *
 * Resolves `false` when no such activity is declared, so a 2D-only build can
 * call this unconditionally.
 *
 * Note this is not something the renderer will do for you: `@reactvision/
 * react-viro` gates its equivalent (`VRLauncher.launchVRScene()`) behind a
 * Meta-hardware check on `Build.MANUFACTURER`/`BRAND`, so it never fires on
 * PICO. Use `exitVRScene()` from react-viro to come back to the panel.
 */
export async function enterImmersiveScene(): Promise<boolean> {
  return ExpoPicoModule.enterImmersiveScene();
}

/** Whether this build declares an activity with PICO's VR intent category. */
export async function hasImmersiveActivity(): Promise<boolean> {
  return ExpoPicoModule.hasImmersiveActivity();
}
