"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LUCIDE_VERSION = exports.LUCIDE_ICONS = exports.iconMeshToViroGeometry = exports.getLucideIconMesh = exports.getIconMesh = exports.DEFAULT_ICON_TOLERANCE = exports.DEFAULT_ICON_STROKE_WIDTH = exports.PICO_EYE_TRACKING_PERMISSION = exports.HORIZON_EYE_TRACKING_PERMISSION = exports.eyeTrackingPermissionFor = exports.ensureEyeTrackingPermission = exports.IMMERSIVE_ROOT_COMPONENT = exports.hasImmersiveSceneRegistered = exports.registerImmersiveScene = exports.isLocationAvailable = exports.requestLocationPermission = exports.getPicoLocation = exports.spatialAudio = exports.sensors = exports.motionTracker = exports.controllers = exports.scene = exports.boundary = exports.hand = exports.body = exports.face = exports.eye = exports.display = exports.isCapabilityAvailable = exports.getCapabilitySnapshot = exports.getDeclaredTargetDevices = exports.getDeclaredRefreshRates = exports.getDeclaredCapabilities = exports.capabilities = exports.formatDiagnostics = exports.readRuntimeFacts = exports.readBuildTimeFacts = exports.buildDiagnosticsReport = exports.getPicoDiagnostics = void 0;
exports.pulseHaptic = pulseHaptic;
exports.isHapticsAvailable = isHapticsAvailable;
exports.addPassthroughDialListener = addPassthroughDialListener;
exports.setPassthrough = setPassthrough;
exports.isPassthroughAvailable = isPassthroughAvailable;
exports.isPicoBuild = isPicoBuild;
exports.isPicoDevice = isPicoDevice;
exports.getSpatialMode = getSpatialMode;
exports.getPicoTargetProfile = getPicoTargetProfile;
exports.getXrMode = getXrMode;
exports.isSwanRuntime = isSwanRuntime;
exports.getAppType = getAppType;
exports.hasPlatformIdentity = hasPlatformIdentity;
exports.hasIapIdentity = hasIapIdentity;
exports.isPlatformSdkPresent = isPlatformSdkPresent;
exports.getPlatformSdkVersion = getPlatformSdkVersion;
exports.getPlatformSdkProbe = getPlatformSdkProbe;
exports.getPicoRuntimeInfo = getPicoRuntimeInfo;
exports.enterImmersiveScene = enterImmersiveScene;
exports.hasImmersiveActivity = hasImmersiveActivity;
exports.exitImmersiveScene = exitImmersiveScene;
const platform_service_common_1 = require("@expo-pico/platform-service-common");
const ExpoPicoModule_1 = __importStar(require("./ExpoPicoModule"));
const eyeTrackingPermission_1 = require("./eyeTrackingPermission");
const immersive_1 = require("./immersive");
// ─── Controller haptics + passthrough dial ──────────────────────────────────
// Both were separate native modules under Expo Modules (ExpoPicoHaptics,
// ExpoPicoPassthrough). They are members of the PicoRuntime HybridObject now;
// the exported functions below are unchanged.
function runtime() {
    return (0, ExpoPicoModule_1.getPicoRuntimeAdapter)();
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
async function pulseHaptic(hand, amplitude, durationMs) {
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
function isHapticsAvailable() {
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
function addPassthroughDialListener(cb) {
    const r = runtime();
    if (!r?.passthroughAvailable)
        return platform_service_common_1.NULL_SUBSCRIPTION;
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
async function setPassthrough(enabled, level = 1.0) {
    const r = runtime();
    if (!r?.passthroughAvailable) {
        throw new Error('ExpoPicoPassthrough surface not available');
    }
    return r.setPassthroughLevel(enabled, level);
}
/** True when the passthrough surface is wired at runtime. */
function isPassthroughAvailable() {
    return runtime()?.passthroughAvailable ?? false;
}
function isPicoBuild() {
    return ExpoPicoModule_1.default.isPicoBuild ?? false;
}
function isPicoDevice() {
    return ExpoPicoModule_1.default.isPicoDevice ?? false;
}
function getSpatialMode() {
    const mode = ExpoPicoModule_1.default.spatialMode;
    const valid = [
        '2d',
        'windowed',
        'shared-space',
        'full-space',
        'immersive',
        'volume',
    ];
    return valid.includes(mode) ? mode : '2d';
}
function getPicoTargetProfile() {
    const profile = ExpoPicoModule_1.default.targetProfile;
    const valid = ['legacy', 'pico4', 'pico4ultra', 'swan', 'unknown'];
    return valid.includes(profile)
        ? profile
        : 'unknown';
}
/**
 * Returns the active PICO XR mode. Mirrors the plugin-time `xrMode` option
 * and the native `PicoXRPlatform` enum.
 *
 * `'quest'` is the Meta Horizon flavor: an XR build with no PICO runtime. A
 * check of `getXrMode() !== 'mobile'` is true there, so use {@link isPicoBuild}
 * when the question is "is the PICO runtime present".
 */
function getXrMode() {
    return (0, eyeTrackingPermission_1.buildXrMode)();
}
/** Convenience: `true` when the active runtime is Project Swan. */
function isSwanRuntime() {
    return getXrMode() === 'pico-swan';
}
/** Returns the launcher contract app type (`vr` | `mr` | `2d`). */
function getAppType() {
    const t = ExpoPicoModule_1.default.appType;
    if (t === 'vr' || t === 'mr')
        return t;
    return '2d';
}
/**
 * True when the Platform SDK has enough identity resources to attempt
 * `CoreService.Initialize`. Sibling packages (expo-pico-account, etc.)
 * use this to short-circuit early before calling native init.
 */
function hasPlatformIdentity() {
    return ExpoPicoModule_1.default.hasPlatformIdentity ?? false;
}
/**
 * True when both an IAP merchant ID and pay key are present (in either
 * region). `expo-pico-iap` uses this to gate the `getProducts` /
 * `purchase` surface.
 */
function hasIapIdentity() {
    return ExpoPicoModule_1.default.hasIapIdentity ?? false;
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
function isPlatformSdkPresent() {
    return ExpoPicoModule_1.default.platformSdkPresent ?? false;
}
/**
 * PICO Platform SDK version string read from
 * `com.pvr.platform.sdk.BuildConfig.VERSION_NAME` (and a few fallback
 * candidates). Returns `null` when the SDK is absent or the version
 * constant can't be read.
 */
function getPlatformSdkVersion() {
    return ExpoPicoModule_1.default.platformSdkVersion ?? null;
}
/**
 * Fine-grained per-surface SDK probe report. Each entry names a
 * sibling-package domain (`account`, `iap`, `notifications`, ...) and
 * whether its specific SDK entry class resolves on the classpath.
 * Useful for diagnostics panels that want to show which siblings are
 * live vs stubbed.
 */
async function getPlatformSdkProbe() {
    const native = (await ExpoPicoModule_1.default.getPlatformSdkProbe()) ?? {};
    // Native returns a plain map. Normalize to the typed shape with
    // explicit false fallbacks so consumers can destructure without
    // worrying about missing keys across SDK minor versions.
    const probe = native;
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
function getPicoRuntimeInfo() {
    return {
        isPicoBuild: isPicoBuild(),
        isPicoDevice: isPicoDevice(),
        spatialMode: getSpatialMode(),
        targetProfile: getPicoTargetProfile(),
        containerMode: (() => {
            const m = ExpoPicoModule_1.default.containerMode;
            if (m === 'window-container' || m === 'stage')
                return m;
            return 'none';
        })(),
        xrMode: getXrMode(),
        appType: getAppType(),
        picoAppId: ExpoPicoModule_1.default.picoAppId ?? null,
        picoAppKey: ExpoPicoModule_1.default.picoAppKey ?? null,
        hasPlatformIdentity: hasPlatformIdentity(),
        hasIapIdentity: hasIapIdentity(),
        picoOsVersion: ExpoPicoModule_1.default.picoOsVersion ?? null,
        deviceModel: ExpoPicoModule_1.default.deviceModel ?? null,
        emulatorOptimizations: ExpoPicoModule_1.default.emulatorOptimizations ?? false,
        swanRuntimeInitialized: ExpoPicoModule_1.default.swanRuntimeInitialized ?? false,
        os5RuntimeInitialized: ExpoPicoModule_1.default.os5RuntimeInitialized ?? false,
        platformSdkPresent: isPlatformSdkPresent(),
        platformSdkVersion: getPlatformSdkVersion(),
    };
}
// Runtime diagnostics.
var diagnostics_1 = require("./diagnostics");
Object.defineProperty(exports, "getPicoDiagnostics", { enumerable: true, get: function () { return diagnostics_1.getPicoDiagnostics; } });
Object.defineProperty(exports, "buildDiagnosticsReport", { enumerable: true, get: function () { return diagnostics_1.buildDiagnosticsReport; } });
Object.defineProperty(exports, "readBuildTimeFacts", { enumerable: true, get: function () { return diagnostics_1.readBuildTimeFacts; } });
Object.defineProperty(exports, "readRuntimeFacts", { enumerable: true, get: function () { return diagnostics_1.readRuntimeFacts; } });
Object.defineProperty(exports, "formatDiagnostics", { enumerable: true, get: function () { return diagnostics_1.formatDiagnostics; } });
// Capability runtime surface (declared flags + per-capability
// async APIs covering display, tracking, spatial, controllers, sensors,
// and spatial audio).
var capabilities_1 = require("./capabilities");
Object.defineProperty(exports, "capabilities", { enumerable: true, get: function () { return capabilities_1.capabilities; } });
Object.defineProperty(exports, "getDeclaredCapabilities", { enumerable: true, get: function () { return capabilities_1.getDeclaredCapabilities; } });
Object.defineProperty(exports, "getDeclaredRefreshRates", { enumerable: true, get: function () { return capabilities_1.getDeclaredRefreshRates; } });
Object.defineProperty(exports, "getDeclaredTargetDevices", { enumerable: true, get: function () { return capabilities_1.getDeclaredTargetDevices; } });
Object.defineProperty(exports, "getCapabilitySnapshot", { enumerable: true, get: function () { return capabilities_1.getCapabilitySnapshot; } });
Object.defineProperty(exports, "isCapabilityAvailable", { enumerable: true, get: function () { return capabilities_1.isCapabilityAvailable; } });
Object.defineProperty(exports, "display", { enumerable: true, get: function () { return capabilities_1.display; } });
Object.defineProperty(exports, "eye", { enumerable: true, get: function () { return capabilities_1.eye; } });
Object.defineProperty(exports, "face", { enumerable: true, get: function () { return capabilities_1.face; } });
Object.defineProperty(exports, "body", { enumerable: true, get: function () { return capabilities_1.body; } });
Object.defineProperty(exports, "hand", { enumerable: true, get: function () { return capabilities_1.hand; } });
Object.defineProperty(exports, "boundary", { enumerable: true, get: function () { return capabilities_1.boundary; } });
Object.defineProperty(exports, "scene", { enumerable: true, get: function () { return capabilities_1.scene; } });
Object.defineProperty(exports, "controllers", { enumerable: true, get: function () { return capabilities_1.controllers; } });
Object.defineProperty(exports, "motionTracker", { enumerable: true, get: function () { return capabilities_1.motionTracker; } });
Object.defineProperty(exports, "sensors", { enumerable: true, get: function () { return capabilities_1.sensors; } });
Object.defineProperty(exports, "spatialAudio", { enumerable: true, get: function () { return capabilities_1.spatialAudio; } });
// ─── Location (expo-location wrapper) ───────────────────────────────────────
// PICO OS is Android-based, so stock expo-location works on device. Exposed
// here so PICO apps get a permission-aware getPicoLocation() from the library.
var location_1 = require("./location");
Object.defineProperty(exports, "getPicoLocation", { enumerable: true, get: function () { return location_1.getPicoLocation; } });
Object.defineProperty(exports, "requestLocationPermission", { enumerable: true, get: function () { return location_1.requestLocationPermission; } });
Object.defineProperty(exports, "isLocationAvailable", { enumerable: true, get: function () { return location_1.isLocationAvailable; } });
var immersive_2 = require("./immersive");
Object.defineProperty(exports, "registerImmersiveScene", { enumerable: true, get: function () { return immersive_2.registerImmersiveScene; } });
Object.defineProperty(exports, "hasImmersiveSceneRegistered", { enumerable: true, get: function () { return immersive_2.hasImmersiveSceneRegistered; } });
Object.defineProperty(exports, "IMMERSIVE_ROOT_COMPONENT", { enumerable: true, get: function () { return immersive_2.IMMERSIVE_ROOT_COMPONENT; } });
var eyeTrackingPermission_2 = require("./eyeTrackingPermission");
Object.defineProperty(exports, "ensureEyeTrackingPermission", { enumerable: true, get: function () { return eyeTrackingPermission_2.ensureEyeTrackingPermission; } });
Object.defineProperty(exports, "eyeTrackingPermissionFor", { enumerable: true, get: function () { return eyeTrackingPermission_2.eyeTrackingPermissionFor; } });
Object.defineProperty(exports, "HORIZON_EYE_TRACKING_PERMISSION", { enumerable: true, get: function () { return eyeTrackingPermission_2.HORIZON_EYE_TRACKING_PERMISSION; } });
Object.defineProperty(exports, "PICO_EYE_TRACKING_PERMISSION", { enumerable: true, get: function () { return eyeTrackingPermission_2.PICO_EYE_TRACKING_PERMISSION; } });
exports.default = ExpoPicoModule_1.default;
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
 *
 * Does not ask for eye tracking. Meta wants a hybrid app to request it only
 * once the immersive activity launches, so the root registered with
 * `registerImmersiveScene()` asks when it mounts there. See
 * {@link ensureEyeTrackingPermission}.
 */
async function enterImmersiveScene() {
    if (!(0, immersive_1.hasImmersiveSceneRegistered)()) {
        // Launching anyway would hand the display to an activity with no root
        // component: a blank loading screen, no error, nothing in logcat. Refusing
        // keeps the user on the 2D panel and says exactly what is missing.
        console.error(`[@expo-pico/core] enterImmersiveScene(): no component registered as ` +
            `"${immersive_1.IMMERSIVE_ROOT_COMPONENT}". Call registerImmersiveScene(YourScene) ` +
            `at module scope in your app entry (index.js), before any navigation — ` +
            `the immersive activity starts immediately and cannot wait for a route ` +
            `to load. Staying on the 2D panel.`);
        return false;
    }
    return ExpoPicoModule_1.default.enterImmersiveScene();
}
/** Whether this build declares an activity with PICO's VR intent category. */
async function hasImmersiveActivity() {
    return ExpoPicoModule_1.default.hasImmersiveActivity();
}
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
async function exitImmersiveScene() {
    return ExpoPicoModule_1.default.exitImmersiveScene();
}
// ─── Icon meshes (Eskiu) ────────────────────────────────────────────────────
// Lucide icons as triangle meshes for the immersive Viro scene, where there is
// no SVG renderer. Built natively by the Eskiu runtime.
var iconMesh_1 = require("./icons/iconMesh");
Object.defineProperty(exports, "DEFAULT_ICON_STROKE_WIDTH", { enumerable: true, get: function () { return iconMesh_1.DEFAULT_ICON_STROKE_WIDTH; } });
Object.defineProperty(exports, "DEFAULT_ICON_TOLERANCE", { enumerable: true, get: function () { return iconMesh_1.DEFAULT_ICON_TOLERANCE; } });
Object.defineProperty(exports, "getIconMesh", { enumerable: true, get: function () { return iconMesh_1.getIconMesh; } });
Object.defineProperty(exports, "getLucideIconMesh", { enumerable: true, get: function () { return iconMesh_1.getLucideIconMesh; } });
Object.defineProperty(exports, "iconMeshToViroGeometry", { enumerable: true, get: function () { return iconMesh_1.iconMeshToViroGeometry; } });
var lucideIcons_generated_1 = require("./icons/lucideIcons.generated");
Object.defineProperty(exports, "LUCIDE_ICONS", { enumerable: true, get: function () { return lucideIcons_generated_1.LUCIDE_ICONS; } });
Object.defineProperty(exports, "LUCIDE_VERSION", { enumerable: true, get: function () { return lucideIcons_generated_1.LUCIDE_VERSION; } });
//# sourceMappingURL=index.js.map