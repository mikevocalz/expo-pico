"use strict";
// Pico Spatial SDK wrapper — window container resize, eye gaze, scene
// mesh, face tracking, body tracking. These ride the legacy PVR-prefixed
// Spatial SDK 1.x AAR (`com.pvr.spatial:spatial-sdk:1.0.0`), which is
// NOT on public Maven — distinct from the modern PPS artifacts that
// expo-pico-core resolves automatically. Each helper degrades gracefully
// when the legacy Spatial SDK AAR isn't on the classpath: listeners stay
// quiet, snapshot getters return null, async calls resolve to false.
Object.defineProperty(exports, "__esModule", { value: true });
exports.setWindowContainerProperties = setWindowContainerProperties;
exports.onGaze = onGaze;
exports.getGazeSnapshot = getGazeSnapshot;
exports.getSceneMesh = getSceneMesh;
exports.onSceneMeshUpdate = onSceneMeshUpdate;
exports.onFace = onFace;
exports.onBody = onBody;
exports.requestFullSpace = requestFullSpace;
exports.createAnchor = createAnchor;
const picoCapabilities_1 = require("./picoCapabilities");
const NULL_SUB = { remove: () => { } };
let spatialModuleCache;
function spatial() {
    if (spatialModuleCache !== undefined)
        return spatialModuleCache;
    try {
        spatialModuleCache = require('@expo-pico/spatial');
    }
    catch {
        spatialModuleCache = null;
    }
    return spatialModuleCache;
}
let warnedTable = {};
function warnOnce(feature, reason) {
    if (warnedTable[feature])
        return;
    warnedTable[feature] = true;
    console.warn(`[pico/spatial] ${feature}: ${reason}`);
}
async function setWindowContainerProperties(props) {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().windowContainer) {
        warnOnce('windowContainer', 'Spatial SDK AAR not on classpath. Manifest <layout> defaults apply on first install; subsequent launches use Pico spatial-container cache. Drop pico-spatial-sdk-*.aar into android/app/libs/ to enable runtime resize.');
        return false;
    }
    try {
        const s = spatial();
        await s.setWindowContainerProperties?.(props);
        return true;
    }
    catch {
        return false;
    }
}
function onGaze(cb) {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().eyeGaze) {
        warnOnce('eyeGaze', 'Spatial SDK AAR not on classpath — no gaze data will arrive.');
        return NULL_SUB;
    }
    try {
        const s = spatial();
        const sub = s.addGazeListener?.(cb);
        return sub && typeof sub.remove === 'function' ? sub : NULL_SUB;
    }
    catch {
        return NULL_SUB;
    }
}
function getGazeSnapshot() {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().eyeGaze)
        return null;
    try {
        return spatial()?.getGazeSnapshot?.() ?? null;
    }
    catch {
        return null;
    }
}
async function getSceneMesh() {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().sceneMesh) {
        warnOnce('sceneMesh', 'Spatial SDK AAR not on classpath — room mesh unavailable.');
        return null;
    }
    try {
        return (await spatial()?.getSceneMesh?.()) ?? null;
    }
    catch {
        return null;
    }
}
function onSceneMeshUpdate(cb) {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().sceneMesh)
        return NULL_SUB;
    try {
        const sub = spatial()?.addSceneMeshUpdateListener?.(cb);
        return sub && typeof sub.remove === 'function' ? sub : NULL_SUB;
    }
    catch {
        return NULL_SUB;
    }
}
function onFace(cb) {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().faceTracking) {
        warnOnce('faceTracking', 'Spatial SDK AAR not on classpath — face blendshapes unavailable.');
        return NULL_SUB;
    }
    try {
        const sub = spatial()?.addFaceListener?.(cb);
        return sub && typeof sub.remove === 'function' ? sub : NULL_SUB;
    }
    catch {
        return NULL_SUB;
    }
}
function onBody(cb) {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().bodyTracking) {
        warnOnce('bodyTracking', 'Spatial SDK AAR not on classpath — body pose unavailable.');
        return NULL_SUB;
    }
    try {
        const sub = spatial()?.addBodyListener?.(cb);
        return sub && typeof sub.remove === 'function' ? sub : NULL_SUB;
    }
    catch {
        return NULL_SUB;
    }
}
// ───────── Space transitions ─────────
async function requestFullSpace() {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().windowContainer)
        return false;
    try {
        await spatial()?.requestFullSpace?.();
        return true;
    }
    catch {
        return false;
    }
}
async function createAnchor(pose) {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().windowContainer)
        return null;
    try {
        const result = await spatial()?.createSpatialAnchor?.(pose);
        return result ?? null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=picoSpatial.js.map