import { type Subscription } from '@expo-pico/platform-service-common';
import ExpoPicoModule from './ExpoPicoModule';
import type { PicoAppType, PicoRuntimeInfo, PicoSpatialMode, PicoTargetProfileRuntime, PicoXRMode, HapticHand, PassthroughLevelEvent } from './types';
export type { PicoAppType, PicoRuntimeInfo, PicoSpatialMode, PicoTargetProfileRuntime, PicoXRMode, HapticHand, PicoPlatformSdkProbe, ExpoPicoModuleInterface, PassthroughLevelEvent, } from './types';
export type { Subscription };
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
export declare function pulseHaptic(hand: HapticHand, amplitude: number, durationMs: number): Promise<void>;
/**
 * True when the haptics surface is wired at runtime. Note this is one of the
 * few surfaces still gated by the legacy PVR AAR (PXR_Plugin); the modern PPS
 * Maven artifacts do not cover programmatic haptics.
 */
export declare function isHapticsAvailable(): boolean;
/**
 * Adds a listener for physical PICO passthrough dial events.
 *
 * On PICO 4 / PICO 4 Ultra the hardware transparency dial fires this callback
 * whenever the user turns it, with `{ level: 0.0-1.0, enabled: boolean }`.
 * Drive a `passthroughTransparency` prop from `level`. Inert on non-PICO
 * devices — the subscription returns but never fires.
 */
export declare function addPassthroughDialListener(cb: (event: PassthroughLevelEvent) => void): Subscription;
/**
 * Programmatically enable/disable passthrough and set the transparency level.
 *
 * @param enabled true = show the real-world background
 * @param level   0.0 fully virtual - 1.0 fully real-world. Defaults to 1.
 *
 * Rejects with SERVICE_UNAVAILABLE when PXR_Plugin is not present.
 */
export declare function setPassthrough(enabled: boolean, level?: number): Promise<void>;
/** True when the passthrough surface is wired at runtime. */
export declare function isPassthroughAvailable(): boolean;
export declare function isPicoBuild(): boolean;
export declare function isPicoDevice(): boolean;
export declare function getSpatialMode(): PicoSpatialMode;
export declare function getPicoTargetProfile(): PicoTargetProfileRuntime;
/**
 * Returns the active PICO XR mode. Mirrors the plugin-time `xrMode` option
 * and the native `PicoXRPlatform` enum.
 *
 * `'quest'` is the Meta Horizon flavor: an XR build with no PICO runtime. A
 * check of `getXrMode() !== 'mobile'` is true there, so use {@link isPicoBuild}
 * when the question is "is the PICO runtime present".
 */
export declare function getXrMode(): PicoXRMode;
/** Convenience: `true` when the active runtime is Project Swan. */
export declare function isSwanRuntime(): boolean;
/** Returns the launcher contract app type (`vr` | `mr` | `2d`). */
export declare function getAppType(): PicoAppType;
/**
 * True when the Platform SDK has enough identity resources to attempt
 * `CoreService.Initialize`. Sibling packages (expo-pico-account, etc.)
 * use this to short-circuit early before calling native init.
 */
export declare function hasPlatformIdentity(): boolean;
/**
 * True when both an IAP merchant ID and pay key are present (in either
 * region). `expo-pico-iap` uses this to gate the `getProducts` /
 * `purchase` surface.
 */
export declare function hasIapIdentity(): boolean;
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
export declare function isPlatformSdkPresent(): boolean;
/**
 * PICO Platform SDK version string read from
 * `com.pvr.platform.sdk.BuildConfig.VERSION_NAME` (and a few fallback
 * candidates). Returns `null` when the SDK is absent or the version
 * constant can't be read.
 */
export declare function getPlatformSdkVersion(): string | null;
/**
 * Fine-grained per-surface SDK probe report. Each entry names a
 * sibling-package domain (`account`, `iap`, `notifications`, ...) and
 * whether its specific SDK entry class resolves on the classpath.
 * Useful for diagnostics panels that want to show which siblings are
 * live vs stubbed.
 */
export declare function getPlatformSdkProbe(): Promise<import('./types').PicoPlatformSdkProbe>;
export declare function getPicoRuntimeInfo(): PicoRuntimeInfo;
export { getPicoDiagnostics, buildDiagnosticsReport, readBuildTimeFacts, readRuntimeFacts, formatDiagnostics, } from './diagnostics';
export type { BuildTimeFacts, RuntimeFacts } from './diagnostics';
export type { DeclaredFeature, DeclaredPermission, DiagnosticFinding, DiagnosticSeverity, PicoDiagnosticsReport, } from './types';
export { capabilities, getDeclaredCapabilities, getDeclaredRefreshRates, getDeclaredTargetDevices, getCapabilitySnapshot, isCapabilityAvailable, display, eye, face, body, hand, boundary, scene, controllers, motionTracker, sensors, spatialAudio, } from './capabilities';
export type { PicoBodyJoint, PicoCapabilityName, PicoCapabilitySnapshotEntry, PicoController, PicoDeclaredCapabilities, PicoDetectedPlane, PicoEyePose, PicoFoveationLevel, PicoHandPose, PicoHandPoseSide, PicoHighRateSensor, PicoMotionTracker, } from './types';
export { getPicoLocation, requestLocationPermission, isLocationAvailable } from './location';
export { registerImmersiveScene, hasImmersiveSceneRegistered, IMMERSIVE_ROOT_COMPONENT, } from './immersive';
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
export declare function enterImmersiveScene(): Promise<boolean>;
/** Whether this build declares an activity with PICO's VR intent category. */
export declare function hasImmersiveActivity(): Promise<boolean>;
/**
 * Finish the immersive activity and return to the 2D panel.
 *
 * Prefer this to react-viro's `exitVRScene()`, which delegates to a
 * `VRLauncher` native module the Viro plugin never generates and is a
 * documented no-op without it.
 *
 * Resolves `false` when the immersive activity is not in front, so a shared
 * back handler cannot close the panel by mistake.
 */
export declare function exitImmersiveScene(): Promise<boolean>;
export { DEFAULT_ICON_STROKE_WIDTH, DEFAULT_ICON_TOLERANCE, getIconMesh, getLucideIconMesh, iconMeshToViroGeometry, } from './icons/iconMesh';
export type { IconMesh, IconMeshOptions, ViroIconGeometry, ViroIconGeometryOptions, } from './icons/iconMesh';
export { LUCIDE_ICONS, LUCIDE_VERSION } from './icons/lucideIcons.generated';
export type { LucideIconName } from './icons/lucideIcons.generated';
//# sourceMappingURL=index.d.ts.map