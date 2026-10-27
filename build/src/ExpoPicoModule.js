"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPicoRuntimeAdapter = getPicoRuntimeAdapter;
const hybrid_1 = require("./hybrid");
/**
 * Nitro-backed replacement for the former Expo Modules default export.
 *
 * Keeps the exact shape the rest of the package already consumes — sync
 * properties, `| null` rather than optionals, and positional tuples for
 * vectors — so capabilities.ts, diagnostics.ts and types.ts need no changes
 * and the public API is unchanged. Struct/tuple and undefined/null
 * translation happens here and nowhere else.
 */
function core() {
    return (0, hybrid_1.resolvePicoCore)();
}
function runtime() {
    return (0, hybrid_1.resolvePicoRuntime)();
}
/** The PicoRuntime HybridObject, or null when the native library is absent. */
function getPicoRuntimeAdapter() {
    return runtime();
}
const nn = (v) => (v === undefined ? null : v);
const vec3 = (v) => v ? [v.x, v.y, v.z] : null;
const quat = (q) => [q.x, q.y, q.z, q.w];
const UNAVAILABLE = 'PICO native library not present in this build';
function requireRuntime() {
    const r = runtime();
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
        return nn(await runtime()?.getCurrentRefreshRate());
    },
    async getSupportedRefreshRates() {
        return nn(await runtime()?.getSupportedRefreshRates());
    },
    async setRefreshRate(hz) {
        return requireRuntime().setRefreshRate(hz);
    },
    async getFoveationLevel() {
        return nn(await runtime()?.getFoveationLevel());
    },
    async setFoveationLevel(level) {
        return requireRuntime().setFoveationLevel(level);
    },
    async setPassthroughEnabled(enabled) {
        return requireRuntime().setPassthroughEnabled(enabled);
    },
    async isPassthroughActive() {
        return nn(await runtime()?.isPassthroughActive());
    },
    // ── Tracking ──────────────────────────────────────────────────────────────
    async enableEyeTracking() {
        return requireRuntime().enableEyeTracking();
    },
    async disableEyeTracking() {
        return requireRuntime().disableEyeTracking();
    },
    async getEyePose() {
        const p = await runtime()?.getEyePose();
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
        return nn(await runtime()?.getFaceWeights());
    },
    async enableBodyTracking() {
        return requireRuntime().enableBodyTracking();
    },
    async disableBodyTracking() {
        return requireRuntime().disableBodyTracking();
    },
    async getBodyJoints() {
        const joints = await runtime()?.getBodyJoints();
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
        const pose = await runtime()?.getHandPose();
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
        return nn(await runtime()?.isBoundaryVisible());
    },
    async setBoundaryVisible(visible) {
        return requireRuntime().setBoundaryVisible(visible);
    },
    async getBoundaryGeometry() {
        const pts = await runtime()?.getBoundaryGeometry();
        return pts ? pts.map((p) => [p.x, p.y, p.z]) : null;
    },
    async refreshSceneMesh() {
        return requireRuntime().refreshSceneMesh();
    },
    async getSceneMeshTriangleCount() {
        return nn(await runtime()?.getSceneMeshTriangleCount());
    },
    async getDetectedPlanes() {
        const planes = await runtime()?.getDetectedPlanes();
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
        return nn(await runtime()?.getControllers());
    },
    async triggerHaptic(hand, amplitude, durationMs) {
        return requireRuntime().triggerHaptic(hand, amplitude, durationMs);
    },
    async getMotionTrackers() {
        const trackers = await runtime()?.getMotionTrackers();
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
        return (await runtime()?.getHighRateSensors()) ?? [];
    },
    async isSpatialAudioEnabled() {
        return nn(await runtime()?.isSpatialAudioEnabled());
    },
    async setSpatialAudioEnabled(enabled) {
        return requireRuntime().setSpatialAudioEnabled(enabled);
    },
    async getHrtfProfile() {
        return nn(await runtime()?.getHrtfProfile());
    },
};
exports.default = ExpoPicoModule;
//# sourceMappingURL=ExpoPicoModule.js.map