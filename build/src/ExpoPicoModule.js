"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPicoRuntimeAdapter = getPicoRuntimeAdapter;
const expo_modules_core_1 = require("expo-modules-core");
let coreV2Cache;
let runtimeV2Cache;
let passthroughListenerId = 0;
function coreV2() {
    if (coreV2Cache !== undefined)
        return coreV2Cache;
    try {
        coreV2Cache = (0, expo_modules_core_1.requireOptionalNativeModule)('PicoCoreV2');
    }
    catch {
        coreV2Cache = null;
    }
    return coreV2Cache;
}
function runtimeV2() {
    if (runtimeV2Cache !== undefined)
        return runtimeV2Cache;
    try {
        runtimeV2Cache = (0, expo_modules_core_1.requireOptionalNativeModule)('PicoRuntimeV2');
    }
    catch {
        runtimeV2Cache = null;
    }
    return runtimeV2Cache;
}
function core() {
    const v2 = coreV2();
    if (v2) {
        const info = () => v2.getInfo();
        const adapter = {
            get isPicoBuild() {
                return !!info().isPicoBuild;
            },
            get isPicoDevice() {
                return !!info().isPicoDevice;
            },
            get spatialMode() {
                return info().spatialMode ?? 'none';
            },
            get containerMode() {
                return info().containerMode ?? 'none';
            },
            get targetProfile() {
                return info().targetProfile ?? 'unknown';
            },
            get xrMode() {
                return info().xrMode ?? 'mobile';
            },
            get appType() {
                return info().appType ?? '2d';
            },
            get picoAppId() {
                return info().picoAppId ?? undefined;
            },
            get picoAppKey() {
                return info().picoAppKey ?? undefined;
            },
            get hasPlatformIdentity() {
                return !!info().hasPlatformIdentity;
            },
            get hasIapIdentity() {
                return !!info().hasIapIdentity;
            },
            get picoOsVersion() {
                return info().picoOsVersion ?? undefined;
            },
            get deviceModel() {
                return info().deviceModel ?? undefined;
            },
            get emulatorOptimizations() {
                return !!info().emulatorOptimizations;
            },
            get swanRuntimeInitialized() {
                return !!info().swanRuntimeInitialized;
            },
            get os5RuntimeInitialized() {
                return !!info().os5RuntimeInitialized;
            },
            get platformSdkPresent() {
                return !!info().platformSdkPresent;
            },
            get platformSdkVersion() {
                return info().platformSdkVersion ?? undefined;
            },
            get declaredCapabilities() {
                return v2.getDeclaredCapabilities();
            },
            get declaredRefreshRates() {
                return v2.getDeclaredRefreshRates();
            },
            get declaredTargetDevices() {
                return v2.getDeclaredTargetDevices();
            },
            hasSystemFeature: async (name) => v2.hasSystemFeature(name),
            getDeclaredFeatures: async () => v2.getDeclaredFeatures(),
            getDeclaredPermissions: async () => v2.getDeclaredPermissions(),
            getPlatformSdkProbe: async () => v2.getPlatformSdkProbe(),
            enterImmersiveScene: async () => v2.enterImmersiveScene(),
            exitImmersiveScene: async () => v2.exitImmersiveScene(),
            hasImmersiveActivity: async () => v2.hasImmersiveActivity(),
            getCapabilitySnapshot: async () => v2.getCapabilitySnapshot(),
            isCapabilityAvailable: async (name) => v2.isCapabilityAvailable(name) ?? undefined,
        };
        return adapter;
    }
    return null;
}
function getPicoRuntimeAdapter() {
    const v2 = runtimeV2();
    if (v2) {
        const adapter = {
            get hapticsAvailable() {
                return !!v2.getAvailability().hapticsAvailable;
            },
            get passthroughAvailable() {
                return !!v2.getAvailability().passthroughAvailable;
            },
            getCurrentRefreshRate: async () => v2.getCurrentRefreshRate() ?? undefined,
            getSupportedRefreshRates: async () => v2.getSupportedRefreshRates() ?? undefined,
            setRefreshRate: async (hz) => v2.setRefreshRate(hz),
            getFoveationLevel: async () => v2.getFoveationLevel(),
            setFoveationLevel: async (level) => v2.setFoveationLevel(level),
            setPassthroughEnabled: async (enabled) => v2.setPassthroughEnabled(enabled),
            isPassthroughActive: async () => v2.isPassthroughActive() ?? undefined,
            setPassthroughLevel: async (enabled, level) => v2.setPassthroughLevel(enabled, level),
            enableEyeTracking: async () => v2.enableEyeTracking(),
            disableEyeTracking: async () => v2.disableEyeTracking(),
            getEyePose: async () => v2.getEyePose() ?? undefined,
            enableFaceTracking: async () => v2.enableFaceTracking(),
            disableFaceTracking: async () => v2.disableFaceTracking(),
            getFaceWeights: async () => v2.getFaceWeights() ?? undefined,
            enableBodyTracking: async () => v2.enableBodyTracking(),
            disableBodyTracking: async () => v2.disableBodyTracking(),
            getBodyJoints: async () => v2.getBodyJoints() ?? undefined,
            enableHandTracking: async () => v2.enableHandTracking(),
            disableHandTracking: async () => v2.disableHandTracking(),
            getHandPose: async () => v2.getHandPose() ?? undefined,
            isBoundaryVisible: async () => v2.isBoundaryVisible() ?? undefined,
            setBoundaryVisible: async (visible) => v2.setBoundaryVisible(visible),
            getBoundaryGeometry: async () => v2.getBoundaryGeometry() ?? undefined,
            refreshSceneMesh: async () => v2.refreshSceneMesh(),
            getSceneMeshTriangleCount: async () => v2.getSceneMeshTriangleCount() ?? undefined,
            getDetectedPlanes: async () => v2.getDetectedPlanes() ?? undefined,
            refreshScene: async () => v2.refreshScene(),
            getControllers: async () => v2.getControllers() ?? undefined,
            triggerHaptic: async (hand, amplitude, durationMs) => v2.triggerHaptic(hand, amplitude, durationMs),
            pulseHaptic: async (hand, amplitude, durationMs) => v2.pulseHaptic(hand, amplitude, durationMs),
            getMotionTrackers: async () => v2.getMotionTrackers() ?? undefined,
            getHighRateSensors: async () => v2.getHighRateSensors(),
            isSpatialAudioEnabled: async () => v2.isSpatialAudioEnabled() ?? undefined,
            setSpatialAudioEnabled: async (enabled) => v2.setSpatialAudioEnabled(enabled),
            getHrtfProfile: async () => v2.getHrtfProfile() ?? undefined,
            addPassthroughDialListener: () => ++passthroughListenerId,
            removeListener: () => { },
        };
        return adapter;
    }
    return null;
}
const nn = (v) => (v === undefined ? null : v);
const vec3 = (v) => v ? [v.x, v.y, v.z] : null;
const quat = (q) => [q.x, q.y, q.z, q.w];
const UNAVAILABLE = 'PICO native library not present in this build';
function requireRuntime() {
    const r = getPicoRuntimeAdapter();
    if (!r)
        throw new Error(UNAVAILABLE);
    return r;
}
const EMPTY_CAPABILITIES = {
    handTracking: false,
    passthrough: false,
    sceneUnderstanding: false,
    eyeTracking: false,
    faceTracking: false,
    bodyTracking: false,
    spatialAudio: false,
    foveatedRendering: false,
    highSamplingRateSensors: false,
    boundary: false,
    sceneMesh: false,
    picoSenseController: false,
    motionTracker: false,
    controllerHaptics: false,
    openXrLoader: false,
    ndkAbiFilters: false,
    developerTools: false,
    entitlementCheck: false,
};
const ExpoPicoModule = {
    // ── Build + device identity ───────────────────────────────────────────────
    get isPicoBuild() {
        return core()?.isPicoBuild ?? false;
    },
    get isPicoDevice() {
        return core()?.isPicoDevice ?? false;
    },
    get spatialMode() {
        return core()?.spatialMode ?? 'none';
    },
    get targetProfile() {
        return core()?.targetProfile ?? 'unknown';
    },
    get containerMode() {
        return core()?.containerMode ?? 'none';
    },
    get xrMode() {
        return core()?.xrMode ?? 'mobile';
    },
    get appType() {
        return core()?.appType ?? '2d';
    },
    get picoAppId() {
        return nn(core()?.picoAppId);
    },
    get picoAppKey() {
        return nn(core()?.picoAppKey);
    },
    get hasPlatformIdentity() {
        return core()?.hasPlatformIdentity ?? false;
    },
    get hasIapIdentity() {
        return core()?.hasIapIdentity ?? false;
    },
    get picoOsVersion() {
        return nn(core()?.picoOsVersion);
    },
    get deviceModel() {
        return nn(core()?.deviceModel);
    },
    get emulatorOptimizations() {
        return core()?.emulatorOptimizations ?? false;
    },
    get swanRuntimeInitialized() {
        return core()?.swanRuntimeInitialized ?? false;
    },
    get os5RuntimeInitialized() {
        return core()?.os5RuntimeInitialized ?? false;
    },
    // ── Platform SDK reflection probe ─────────────────────────────────────────
    get platformSdkPresent() {
        return core()?.platformSdkPresent ?? false;
    },
    get platformSdkVersion() {
        return nn(core()?.platformSdkVersion);
    },
    // ── Prebuild-declared config ──────────────────────────────────────────────
    get declaredCapabilities() {
        return core()?.declaredCapabilities ?? EMPTY_CAPABILITIES;
    },
    get declaredRefreshRates() {
        return core()?.declaredRefreshRates ?? [];
    },
    get declaredTargetDevices() {
        return core()?.declaredTargetDevices ?? [];
    },
    // ── Runtime introspection ─────────────────────────────────────────────────
    async hasSystemFeature(name) {
        return (await core()?.hasSystemFeature(name)) ?? false;
    },
    async getDeclaredFeatures() {
        return (await core()?.getDeclaredFeatures()) ?? [];
    },
    async getDeclaredPermissions() {
        return (await core()?.getDeclaredPermissions()) ?? [];
    },
    async getPlatformSdkProbe() {
        return (await core()?.getPlatformSdkProbe()) ?? {};
    },
    async enterImmersiveScene() {
        return (await core()?.enterImmersiveScene()) ?? false;
    },
    async exitImmersiveScene() {
        return (await core()?.exitImmersiveScene()) ?? false;
    },
    async hasImmersiveActivity() {
        return (await core()?.hasImmersiveActivity()) ?? false;
    },
    async getCapabilitySnapshot() {
        const entries = (await core()?.getCapabilitySnapshot()) ?? [];
        // The spec uses optionals; types.ts uses nulls. Normalise per entry —
        // scalars are handled by nn() but nested structs need mapping.
        return entries.map((e) => ({
            name: e.name,
            declared: e.declared,
            systemFeature: nn(e.systemFeature),
            systemFeatureAvailable: nn(e.systemFeatureAvailable),
            sdkClassFound: nn(e.sdkClassFound),
            sdkAvailable: e.sdkAvailable,
            fullyAvailable: e.fullyAvailable,
        }));
    },
    async isCapabilityAvailable(name) {
        return nn(await core()?.isCapabilityAvailable(name));
    },
    // ── XR display ────────────────────────────────────────────────────────────
    async getCurrentRefreshRate() {
        return nn(await getPicoRuntimeAdapter()?.getCurrentRefreshRate());
    },
    async getSupportedRefreshRates() {
        return nn(await getPicoRuntimeAdapter()?.getSupportedRefreshRates());
    },
    async setRefreshRate(hz) {
        return requireRuntime().setRefreshRate(hz);
    },
    async getFoveationLevel() {
        return nn(await getPicoRuntimeAdapter()?.getFoveationLevel());
    },
    async setFoveationLevel(level) {
        return requireRuntime().setFoveationLevel(level);
    },
    async setPassthroughEnabled(enabled) {
        return requireRuntime().setPassthroughEnabled(enabled);
    },
    async isPassthroughActive() {
        return nn(await getPicoRuntimeAdapter()?.isPassthroughActive());
    },
    // ── Tracking ──────────────────────────────────────────────────────────────
    async enableEyeTracking() {
        return requireRuntime().enableEyeTracking();
    },
    async disableEyeTracking() {
        return requireRuntime().disableEyeTracking();
    },
    async getEyePose() {
        const p = await getPicoRuntimeAdapter()?.getEyePose();
        if (!p)
            return null;
        return {
            leftGazeOrigin: vec3(p.leftGazeOrigin),
            leftGazeDirection: vec3(p.leftGazeDirection),
            rightGazeOrigin: vec3(p.rightGazeOrigin),
            rightGazeDirection: vec3(p.rightGazeDirection),
            leftOpenness: nn(p.leftOpenness),
            rightOpenness: nn(p.rightOpenness),
            leftPupilDiameterMm: nn(p.leftPupilDiameterMm),
            rightPupilDiameterMm: nn(p.rightPupilDiameterMm),
        };
    },
    async enableFaceTracking() {
        return requireRuntime().enableFaceTracking();
    },
    async disableFaceTracking() {
        return requireRuntime().disableFaceTracking();
    },
    async getFaceWeights() {
        return nn(await getPicoRuntimeAdapter()?.getFaceWeights());
    },
    async enableBodyTracking() {
        return requireRuntime().enableBodyTracking();
    },
    async disableBodyTracking() {
        return requireRuntime().disableBodyTracking();
    },
    async getBodyJoints() {
        const joints = await getPicoRuntimeAdapter()?.getBodyJoints();
        if (!joints)
            return null;
        return joints.map((j) => ({
            joint: j.joint,
            position: vec3(j.position),
            rotation: quat(j.rotation),
            confidence: j.confidence,
        }));
    },
    async enableHandTracking() {
        return requireRuntime().enableHandTracking();
    },
    async disableHandTracking() {
        return requireRuntime().disableHandTracking();
    },
    async getHandPose() {
        const pose = await getPicoRuntimeAdapter()?.getHandPose();
        if (!pose)
            return null;
        const side = (s) => s
            ? {
                joints: s.joints.map((j) => ({
                    position: vec3(j.position),
                    rotation: quat(j.rotation),
                })),
                confidence: s.confidence,
            }
            : null;
        return {
            leftHand: side(pose.leftHand),
            rightHand: side(pose.rightHand),
            aimEnabled: pose.aimEnabled,
        };
    },
    // ── Spatial ───────────────────────────────────────────────────────────────
    async isBoundaryVisible() {
        return nn(await getPicoRuntimeAdapter()?.isBoundaryVisible());
    },
    async setBoundaryVisible(visible) {
        return requireRuntime().setBoundaryVisible(visible);
    },
    async getBoundaryGeometry() {
        const pts = await getPicoRuntimeAdapter()?.getBoundaryGeometry();
        return pts ? pts.map((p) => [p.x, p.y, p.z]) : null;
    },
    async refreshSceneMesh() {
        return requireRuntime().refreshSceneMesh();
    },
    async getSceneMeshTriangleCount() {
        return nn(await getPicoRuntimeAdapter()?.getSceneMeshTriangleCount());
    },
    async getDetectedPlanes() {
        const planes = await getPicoRuntimeAdapter()?.getDetectedPlanes();
        if (!planes)
            return null;
        return planes.map((p) => ({
            id: p.id,
            label: p.label,
            center: vec3(p.center),
            extent: [p.extent.width, p.extent.height],
            normal: vec3(p.normal),
        }));
    },
    async refreshScene() {
        return requireRuntime().refreshScene();
    },
    // ── Controllers, haptics, trackers ────────────────────────────────────────
    async getControllers() {
        return nn(await getPicoRuntimeAdapter()?.getControllers());
    },
    async triggerHaptic(hand, amplitude, durationMs) {
        return requireRuntime().triggerHaptic(hand, amplitude, durationMs);
    },
    async getMotionTrackers() {
        const trackers = await getPicoRuntimeAdapter()?.getMotionTrackers();
        if (!trackers)
            return null;
        return trackers.map((t) => ({
            id: t.id,
            attachment: t.attachment,
            connected: t.connected,
            position: vec3(t.position),
            rotation: quat(t.rotation),
            batteryPct: t.batteryPct,
        }));
    },
    // ── Sensors + spatial audio ───────────────────────────────────────────────
    async getHighRateSensors() {
        return (await getPicoRuntimeAdapter()?.getHighRateSensors()) ?? [];
    },
    async isSpatialAudioEnabled() {
        return nn(await getPicoRuntimeAdapter()?.isSpatialAudioEnabled());
    },
    async setSpatialAudioEnabled(enabled) {
        return requireRuntime().setSpatialAudioEnabled(enabled);
    },
    async getHrtfProfile() {
        return nn(await getPicoRuntimeAdapter()?.getHrtfProfile());
    },
};
exports.default = ExpoPicoModule;
//# sourceMappingURL=ExpoPicoModule.js.map