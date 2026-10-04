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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSpaceState = getSpaceState;
exports.getContainerType = getContainerType;
exports.getSpatialCapabilities = getSpatialCapabilities;
exports.getSpatialSdkVersion = getSpatialSdkVersion;
exports.getSpatialSdkProbe = getSpatialSdkProbe;
exports.getLayoutBridgeStatus = getLayoutBridgeStatus;
exports.getSpatialLayoutReadiness = getSpatialLayoutReadiness;
exports.openWindowContainer = openWindowContainer;
exports.closeWindowContainer = closeWindowContainer;
exports.createSpatialAnchor = createSpatialAnchor;
exports.setWindowContainerProperties = setWindowContainerProperties;
exports.requestFullSpace = requestFullSpace;
exports.addGazeListener = addGazeListener;
exports.getGazeSnapshot = getGazeSnapshot;
exports.isEyeGazeAvailable = isEyeGazeAvailable;
exports.getSceneMesh = getSceneMesh;
exports.addSceneMeshUpdateListener = addSceneMeshUpdateListener;
exports.isSceneMeshAvailable = isSceneMeshAvailable;
exports.addFaceListener = addFaceListener;
exports.isFaceTrackingAvailable = isFaceTrackingAvailable;
exports.addBodyListener = addBodyListener;
exports.isBodyTrackingAvailable = isBodyTrackingAvailable;
const expo_modules_core_1 = require("expo-modules-core");
const platform_service_common_1 = require("@expo-pico/platform-service-common");
__exportStar(require("./types"), exports);
__exportStar(require("./layout"), exports);
const layout_1 = require("./layout");
const PKG = '@expo-pico/spatial';
const NO_CAPABILITIES = {
    spaceStates: false,
    spatialAnchors: false,
    sceneUnderstanding: false,
    passthrough: false,
    handTracking: false,
    spatialSdkAvailable: false,
};
let v2Cache;
let v2ListenerId = 0;
function nativeV2() {
    if (v2Cache !== undefined)
        return v2Cache;
    try {
        v2Cache = (0, expo_modules_core_1.requireOptionalNativeModule)('PicoSpatialV2');
    }
    catch {
        v2Cache = null;
    }
    return v2Cache;
}
function native() {
    const v2 = nativeV2();
    if (v2) {
        const info = () => v2.getInfo();
        return {
            get spaceState() {
                return info().spaceState;
            },
            get containerType() {
                return info().containerType;
            },
            get spatialSdkVersion() {
                return info().spatialSdkVersion ?? undefined;
            },
            get capabilities() {
                return info().capabilities;
            },
            get eyeGazeAvailable() {
                return !!info().eyeGazeAvailable;
            },
            get sceneMeshAvailable() {
                return !!info().sceneMeshAvailable;
            },
            get faceTrackingAvailable() {
                return !!info().faceTrackingAvailable;
            },
            get bodyTrackingAvailable() {
                return !!info().bodyTrackingAvailable;
            },
            getSpatialSdkProbe: async () => v2.getSpatialSdkProbe(),
            createSpatialAnchor: async (pose) => v2.createSpatialAnchor(pose),
            setWindowContainerProperties: async (props) => v2.setWindowContainerProperties(props),
            requestFullSpace: async () => v2.requestFullSpace(),
            getGazeSnapshot: async () => v2.getGazeSnapshot() ?? undefined,
            getSceneMesh: async () => v2.getSceneMesh(),
            addGazeListener: () => ++v2ListenerId,
            addSceneMeshUpdateListener: () => ++v2ListenerId,
            addFaceListener: () => ++v2ListenerId,
            addBodyListener: () => ++v2ListenerId,
            removeListener: () => { },
        };
    }
    return null;
}
function toTypedMesh(raw) {
    return {
        vertices: new Float32Array(raw.vertices),
        indices: new Uint32Array(raw.indices),
        normals: raw.normals ? new Float32Array(raw.normals) : undefined,
    };
}
function subscribe(register) {
    const hybrid = native();
    if (!hybrid)
        return platform_service_common_1.NULL_SUBSCRIPTION;
    const id = register(hybrid);
    return { remove: () => hybrid.removeListener(id) };
}
// ─── Space / container state ─────────────────────────────────────────────────
/**
 * Current space state.
 *
 * - 'shared-space': other apps visible; this one runs in a WindowContainer
 * - 'full-space': exclusive use of the spatial environment
 * - 'unknown': not PICO OS 6, or not yet determined
 */
function getSpaceState() {
    const s = native()?.spaceState;
    return s === 'shared-space' || s === 'full-space' ? s : 'unknown';
}
function getContainerType() {
    const c = native()?.containerType;
    return c === 'window-container' || c === 'stage' ? c : 'none';
}
function getSpatialCapabilities() {
    return native()?.capabilities ?? NO_CAPABILITIES;
}
function getSpatialSdkVersion() {
    return native()?.spatialSdkVersion ?? null;
}
function getSpatialSdkProbe() {
    return nativeV2()?.getSpatialSdkProbe() ?? {};
}
/**
 * Status of the native WindowContainer bridge. Never throws: a missing or
 * outdated native module is reported through `reason`.
 */
function getLayoutBridgeStatus() {
    const v2 = nativeV2();
    if (!v2) {
        return unboundStatus('NATIVE_MODULE_UNAVAILABLE: PicoSpatialV2 is not in this binary.');
    }
    if (typeof v2.getLayoutBridgeStatus !== 'function') {
        return unboundStatus('NATIVE_BRIDGE_OUTDATED: this binary predates getLayoutBridgeStatus. Rebuild the app.');
    }
    const raw = v2.getLayoutBridgeStatus();
    return {
        sdkLinked: raw.sdkLinked === true,
        spatialPlatform: raw.spatialPlatform === true,
        reason: raw.reason ?? null,
        lastError: raw.lastError ?? null,
    };
}
function getSpatialLayoutReadiness() {
    return (0, layout_1.layoutReadinessFromProbe)(getSpatialSdkProbe(), getLayoutBridgeStatus());
}
function unboundStatus(reason) {
    return { sdkLinked: false, spatialPlatform: false, reason, lastError: null };
}
function callWindowContainer(method, id, options) {
    if (typeof id !== 'string' || id.trim() === '') {
        return { ok: false, reason: 'INVALID_ID: id must be a non-empty string.' };
    }
    const status = getLayoutBridgeStatus();
    if (!status.sdkLinked || !status.spatialPlatform) {
        return { ok: false, reason: status.reason ?? 'BRIDGE_NOT_READY' };
    }
    const v2 = nativeV2();
    if (!v2 || typeof v2[method] !== 'function') {
        return { ok: false, reason: `NATIVE_BRIDGE_OUTDATED: this binary has no ${method}.` };
    }
    if (v2[method](id, options.tag ?? null) === true)
        return { ok: true };
    const after = getLayoutBridgeStatus();
    return {
        ok: false,
        reason: after.lastError ??
            `SDK_CALL_FAILED: ${method} returned false; see logcat tag ExpoPicoSpatial.`,
    };
}
/**
 * Opens a PICO OS 6 WindowContainer named `id` hosting the app's current
 * activity. On PICO OS 5, phones, or builds without the Spatial SDK
 * (`enableSpatialSdk`), resolves to `{ ok: false, reason }` and never throws.
 *
 * `ok: true` means the SDK call returned without throwing. The SDK gives no
 * completion signal, so it does not confirm the window is on screen yet.
 */
function openWindowContainer(id, options = {}) {
    return callWindowContainer('openWindowContainer', id, options);
}
/** Closes the WindowContainer opened with the same `id` and `tag`. */
function closeWindowContainer(id, options = {}) {
    return callWindowContainer('closeWindowContainer', id, options);
}
// ─── Spatial anchors ─────────────────────────────────────────────────────────
/**
 * Creates a spatial anchor at the given pose.
 *
 * Requires the legacy PVR Spatial SDK 1.x AAR in `vendor/pico-sdk/` or
 * `android/app/libs/` — distinct from the PPS Maven artifacts that
 * expo-pico-core resolves automatically — plus a PICO 4 Ultra or Neo3 on
 * PICO OS 6+.
 *
 * Rejects with SERVICE_UNAVAILABLE when the SDK is absent, VALIDATION_ERROR
 * for a malformed pose.
 */
async function createSpatialAnchor(pose) {
    (0, platform_service_common_1.guardService)(native() != null, PKG, 'createSpatialAnchor');
    const result = await (0, platform_service_common_1.wrapNativeCall)(PKG, 'createSpatialAnchor', native().createSpatialAnchor(pose));
    return {
        anchorId: result.anchorId || result.id || 'unknown',
        persisted: result.persisted,
    };
}
async function setWindowContainerProperties(props) {
    (0, platform_service_common_1.guardService)(native() != null, PKG, 'setWindowContainerProperties');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'setWindowContainerProperties', native().setWindowContainerProperties(props));
}
async function requestFullSpace() {
    (0, platform_service_common_1.guardService)(native() != null, PKG, 'requestFullSpace');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'requestFullSpace', native().requestFullSpace());
}
// ─── Eye gaze ────────────────────────────────────────────────────────────────
/**
 * Per-frame eye gaze updates, at vsync on hardware that supports it. On
 * unsupported devices the subscription is returned but never fires.
 */
function addGazeListener(cb) {
    return subscribe((h) => h.addGazeListener(cb));
}
/** One-shot gaze snapshot; null when eye gaze is unavailable. */
async function getGazeSnapshot() {
    const hybrid = native();
    if (!hybrid?.eyeGazeAvailable)
        return null;
    return (await (0, platform_service_common_1.wrapNativeCall)(PKG, 'getGazeSnapshot', hybrid.getGazeSnapshot())) ?? null;
}
function isEyeGazeAvailable() {
    return native()?.eyeGazeAvailable ?? false;
}
// ─── Scene mesh ──────────────────────────────────────────────────────────────
/**
 * Current scene mesh. Native returns flat number arrays; they are normalised
 * here to Float32Array / Uint32Array.
 *
 * Rejects with SERVICE_UNAVAILABLE when the Spatial SDK is absent.
 */
async function getSceneMesh() {
    (0, platform_service_common_1.guardService)(native()?.sceneMeshAvailable ?? false, PKG, 'getSceneMesh');
    const raw = await (0, platform_service_common_1.wrapNativeCall)(PKG, 'getSceneMesh', native().getSceneMesh());
    return toTypedMesh(raw);
}
/** Payload is normalised to typed arrays before the callback fires. */
function addSceneMeshUpdateListener(cb) {
    return subscribe((h) => h.addSceneMeshUpdateListener((raw) => cb(toTypedMesh(raw))));
}
function isSceneMeshAvailable() {
    return native()?.sceneMeshAvailable ?? false;
}
// ─── Face tracking ───────────────────────────────────────────────────────────
/** Per-frame blendshape updates at vsync. Never fires on unsupported runtimes. */
function addFaceListener(cb) {
    return subscribe((h) => h.addFaceListener(cb));
}
function isFaceTrackingAvailable() {
    return native()?.faceTrackingAvailable ?? false;
}
// ─── Body tracking ───────────────────────────────────────────────────────────
/** Per-frame body joint updates at vsync. Never fires on unsupported runtimes. */
function addBodyListener(cb) {
    return subscribe((h) => h.addBodyListener((joints) => cb(joints.map((j) => ({
        name: j.name,
        position: [j.position.x, j.position.y, j.position.z],
        rotation: [j.rotation.x, j.rotation.y, j.rotation.z, j.rotation.w],
    })))));
}
function isBodyTrackingAvailable() {
    return native()?.bodyTrackingAvailable ?? false;
}
//# sourceMappingURL=index.js.map