"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.capabilities = exports.spatialAudio = exports.sensors = exports.motionTracker = exports.controllers = exports.scene = exports.boundary = exports.hand = exports.body = exports.face = exports.eye = exports.display = void 0;
exports.getDeclaredCapabilities = getDeclaredCapabilities;
exports.getDeclaredRefreshRates = getDeclaredRefreshRates;
exports.getDeclaredTargetDevices = getDeclaredTargetDevices;
exports.getCapabilitySnapshot = getCapabilitySnapshot;
exports.isCapabilityAvailable = isCapabilityAvailable;
const ExpoPicoModule_1 = __importDefault(require("./ExpoPicoModule"));
/**
 * Unified capability runtime surface.
 *
 * This module is the public TypeScript contract for every capability the
 * prebuild plugin declares. Everything is optional at the device/SDK
 * layer: methods either return the real value (PICO device + SDK present)
 * or null / false (mobile emulator, non-PICO target, or SDK-less PICO
 * build).
 *
 * Consumer pattern:
 *
 *   if (await capabilities.isAvailable('eyeTracking')) {
 *     await capabilities.eye.enable();
 *     const pose = await capabilities.eye.getPose();
 *   }
 *
 * Grouped by domain for discoverability:
 *   - capabilities.declared       — plain mirror of the prebuild flags
 *   - capabilities.snapshot()     — full 3-layer snapshot of all caps
 *   - capabilities.isAvailable()  — single-shot query for one cap
 *   - capabilities.display        — refresh rate, foveation, passthrough
 *   - capabilities.eye            — eye tracking
 *   - capabilities.face           — face tracking
 *   - capabilities.body           — body tracking (Motion Tracker)
 *   - capabilities.hand           — hand tracking
 *   - capabilities.boundary       — Guardian / play-area boundary
 *   - capabilities.scene          — planes + scene mesh
 *   - capabilities.controllers    — controller state + haptics
 *   - capabilities.motionTracker  — Motion Tracker dongles
 *   - capabilities.sensors        — high-rate IMU sensors
 *   - capabilities.spatialAudio   — head-tracked HRTF engine
 */
// ─── Build-time declared capability mirror ────────────────────────────
/**
 * Plain mirror of what the prebuild plugin declared. Reads a BuildConfig
 * constant — cheap and synchronous. Useful for gating UI without waiting
 * for a native async call.
 */
function getDeclaredCapabilities() {
    return (ExpoPicoModule_1.default.declaredCapabilities ?? {
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
    });
}
/** Refresh rates (Hz) declared at prebuild time. Empty when none. */
function getDeclaredRefreshRates() {
    return ExpoPicoModule_1.default.declaredRefreshRates ?? [];
}
/** PICO device codenames declared in `targetDevices`. Empty when unconstrained. */
function getDeclaredTargetDevices() {
    return ExpoPicoModule_1.default.declaredTargetDevices ?? [];
}
// ─── Snapshot ────────────────────────────────────────────────────────
/**
 * Full three-layer capability snapshot (declared × systemFeature × sdk).
 * Preferred entry point for a diagnostics panel.
 */
async function getCapabilitySnapshot() {
    return (await ExpoPicoModule_1.default.getCapabilitySnapshot()) ?? [];
}
/**
 * Single-capability availability check. Returns `true` when declared,
 * device supports it, and the SDK class resolves; `false` when any
 * layer is missing; `null` when the capability name is unknown.
 */
async function isCapabilityAvailable(name) {
    return ExpoPicoModule_1.default.isCapabilityAvailable(name);
}
// ─── Display (refresh rate, foveation, passthrough) ─────────────────
exports.display = {
    /** Current display refresh rate in Hz. Null when SDK unavailable. */
    async getCurrentRefreshRate() {
        return ExpoPicoModule_1.default.getCurrentRefreshRate();
    },
    /** List of supported refresh rates. Null when SDK unavailable. */
    async getSupportedRefreshRates() {
        return ExpoPicoModule_1.default.getSupportedRefreshRates();
    },
    /**
     * Request a refresh rate. Returns true when the call was dispatched;
     * the OS may clamp to the closest supported value. Re-query
     * `getCurrentRefreshRate()` to confirm.
     */
    async setRefreshRate(hz) {
        return ExpoPicoModule_1.default.setRefreshRate(hz);
    },
    /** Current foveation level. Null when SDK unavailable. */
    async getFoveationLevel() {
        return ExpoPicoModule_1.default.getFoveationLevel();
    },
    /** Set foveation level. Returns true when the call was dispatched. */
    async setFoveationLevel(level) {
        return ExpoPicoModule_1.default.setFoveationLevel(level);
    },
    /** Enable or disable passthrough. True when the call was dispatched. */
    async setPassthroughEnabled(enabled) {
        return ExpoPicoModule_1.default.setPassthroughEnabled(enabled);
    },
    /** Current passthrough state. Null when SDK unavailable. */
    async isPassthroughActive() {
        return ExpoPicoModule_1.default.isPassthroughActive();
    },
};
// ─── Tracking: eye, face, body, hand ────────────────────────────────
exports.eye = {
    async enable() {
        return ExpoPicoModule_1.default.enableEyeTracking();
    },
    async disable() {
        return ExpoPicoModule_1.default.disableEyeTracking();
    },
    /** Current gaze pose. Null when disabled or SDK unavailable. */
    async getPose() {
        return ExpoPicoModule_1.default.getEyePose();
    },
};
exports.face = {
    async enable() {
        return ExpoPicoModule_1.default.enableFaceTracking();
    },
    async disable() {
        return ExpoPicoModule_1.default.disableFaceTracking();
    },
    /** Face blendshape weights 0..1, keyed by PICO's blendshape name. */
    async getWeights() {
        return ExpoPicoModule_1.default.getFaceWeights();
    },
};
exports.body = {
    async enable() {
        return ExpoPicoModule_1.default.enableBodyTracking();
    },
    async disable() {
        return ExpoPicoModule_1.default.disableBodyTracking();
    },
    /** Per-joint pose list. Null when disabled or SDK unavailable. */
    async getJoints() {
        return ExpoPicoModule_1.default.getBodyJoints();
    },
};
exports.hand = {
    async enable() {
        return ExpoPicoModule_1.default.enableHandTracking();
    },
    async disable() {
        return ExpoPicoModule_1.default.disableHandTracking();
    },
    /** Per-hand joint pose snapshot. Null when disabled or SDK unavailable. */
    async getPose() {
        return ExpoPicoModule_1.default.getHandPose();
    },
};
// ─── Boundary / Guardian ────────────────────────────────────────────
exports.boundary = {
    /** Is the boundary outline currently visible? Null when SDK unavailable. */
    async isVisible() {
        return ExpoPicoModule_1.default.isBoundaryVisible();
    },
    /** Show or hide the boundary outline overlay. */
    async setVisible(visible) {
        return ExpoPicoModule_1.default.setBoundaryVisible(visible);
    },
    /**
     * Polygon vertices defining the boundary in tracking space. Each entry
     * is `[x, y, z]`. Empty list when "stationary" boundary (no polygon).
     * Null when SDK unavailable.
     */
    async getGeometry() {
        return ExpoPicoModule_1.default.getBoundaryGeometry();
    },
};
// ─── Scene (planes + mesh) ──────────────────────────────────────────
exports.scene = {
    /** Detected plane list. Null when scene understanding unavailable. */
    async getPlanes() {
        return ExpoPicoModule_1.default.getDetectedPlanes();
    },
    /** Request a new plane scan. Dispatch only — results arrive on next `getPlanes()`. */
    async refreshPlanes() {
        return ExpoPicoModule_1.default.refreshScene();
    },
    /** Trigger a scene-mesh rescan. */
    async refreshMesh() {
        return ExpoPicoModule_1.default.refreshSceneMesh();
    },
    /** Triangle count reported by the last mesh scan. Null when unavailable. */
    async getMeshTriangleCount() {
        return ExpoPicoModule_1.default.getSceneMeshTriangleCount();
    },
};
// ─── Controllers + haptics + motion tracker ─────────────────────────
exports.controllers = {
    /** Connected controllers (battery, hand, model). */
    async list() {
        return ExpoPicoModule_1.default.getControllers();
    },
    /**
     * Fire a haptic pulse on one controller. `amplitude` 0..1, `durationMs`
     * >= 0. Silently no-ops when controllerHaptics is unavailable.
     */
    async triggerHaptic(side, amplitude, durationMs) {
        return ExpoPicoModule_1.default.triggerHaptic(side, amplitude, durationMs);
    },
};
exports.motionTracker = {
    /** Attached Motion Tracker dongles with pose + battery. */
    async list() {
        return ExpoPicoModule_1.default.getMotionTrackers();
    },
};
// ─── Sensors ────────────────────────────────────────────────────────
exports.sensors = {
    /**
     * IMU sensor rate report. Reflects actual device capability; won't
     * exceed 200Hz on devices where HIGH_SAMPLING_RATE_SENSORS is not
     * honored even with the permission granted.
     */
    async getHighRate() {
        return (await ExpoPicoModule_1.default.getHighRateSensors()) ?? [];
    },
};
// ─── Spatial audio ──────────────────────────────────────────────────
exports.spatialAudio = {
    async isEnabled() {
        return ExpoPicoModule_1.default.isSpatialAudioEnabled();
    },
    async setEnabled(enabled) {
        return ExpoPicoModule_1.default.setSpatialAudioEnabled(enabled);
    },
    /** PICO HRTF profile name ("default", "personal", etc.). */
    async getHrtfProfile() {
        return ExpoPicoModule_1.default.getHrtfProfile();
    },
};
// ─── Umbrella export for consumer discoverability ───────────────────
exports.capabilities = {
    getDeclared: getDeclaredCapabilities,
    getDeclaredRefreshRates,
    getDeclaredTargetDevices,
    getSnapshot: getCapabilitySnapshot,
    isAvailable: isCapabilityAvailable,
    display: exports.display,
    eye: exports.eye,
    face: exports.face,
    body: exports.body,
    hand: exports.hand,
    boundary: exports.boundary,
    scene: exports.scene,
    controllers: exports.controllers,
    motionTracker: exports.motionTracker,
    sensors: exports.sensors,
    spatialAudio: exports.spatialAudio,
};
//# sourceMappingURL=capabilities.js.map