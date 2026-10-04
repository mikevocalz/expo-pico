"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyCapabilityContract = applyCapabilityContract;
const constants_1 = require("./constants");
/**
 * Hardware capability manifest mutation for the PICO-flavor manifest.
 *
 * Emits `uses-feature`, `uses-permission`, and `<application>`-level
 * `meta-data` entries for the capabilities the consumer opted into:
 *
 *   - Eye tracking:        `pico.hardware.eyetracking`  + `com.picovr.permission.EYE_TRACKING`
 *   - Face tracking:       `pico.hardware.facetracking` + `com.picovr.permission.FACE_TRACKING`
 *   - Body tracking:       `pico.hardware.bodytracking` + `com.picovr.permission.BODY_TRACKING`
 *   - Spatial audio:       `pico.hardware.spatialaudio`
 *   - Foveated rendering:  `pico.hardware.foveation` + `com.pico.foveation.enabled` meta-data
 *   - High sampling rate:  `android.permission.HIGH_SAMPLING_RATE_SENSORS`
 *   - Refresh rates:       `com.pico.refreshRates` meta-data with comma-separated Hz values
 *
 * All `uses-feature` entries are emitted with `android:required="false"`
 * so a device that lacks the capability still installs the APK — the
 * consumer is expected to gate runtime usage on
 * `PackageManager.hasSystemFeature(...)`.
 *
 * Idempotent: each entry is keyed by `android:name`, so re-apply updates
 * in place rather than duplicating. Capabilities that are toggled off
 * between prebuilds are removed from the manifest.
 *
 * Note: this helper is the capability *declaration* layer. Runtime
 * bindings to the corresponding PICO SDK surfaces (eye-gaze provider,
 * face-tracker callbacks, scene mesh, body/face tracking, haptics)
 * are implemented in `expo-pico-spatial` and `expo-pico-core` native modules.
 */
function applyCapabilityContract(manifest, options) {
    const features = ensureArray(manifest.manifest, 'uses-feature');
    const permissions = ensureArray(manifest.manifest, 'uses-permission');
    const application = ensureApplication(manifest);
    const metaData = ensureArray(application, 'meta-data');
    // ── Features ────────────────────────────────────────────────────
    upsertFeature(features, constants_1.PICO_FEATURES.EYE_TRACKING, options.eyeTracking);
    upsertFeature(features, constants_1.PICO_FEATURES.FACE_TRACKING, options.faceTracking);
    upsertFeature(features, constants_1.PICO_FEATURES.BODY_TRACKING, options.bodyTracking);
    upsertFeature(features, constants_1.PICO_FEATURES.SPATIAL_AUDIO, options.spatialAudio);
    upsertFeature(features, constants_1.PICO_FEATURES.FOVEATION, options.foveatedRendering);
    upsertFeature(features, constants_1.PICO_FEATURES.BOUNDARY, options.boundary);
    upsertFeature(features, constants_1.PICO_FEATURES.SCENE_MESH, options.sceneMesh);
    upsertFeature(features, constants_1.PICO_FEATURES.CONTROLLER, options.picoSenseController);
    upsertFeature(features, constants_1.PICO_FEATURES.CONTROLLER_MOTION_TRACKER, options.motionTracker);
    upsertFeature(features, constants_1.PICO_FEATURES.CONTROLLER_HAPTIC, options.controllerHaptics);
    // ── Permissions ─────────────────────────────────────────────────
    upsertPermission(permissions, constants_1.PICO_PERMISSIONS.EYE_TRACKING, options.eyeTracking);
    upsertPermission(permissions, constants_1.PICO_PERMISSIONS.FACE_TRACKING, options.faceTracking);
    upsertPermission(permissions, constants_1.PICO_PERMISSIONS.BODY_TRACKING, options.bodyTracking);
    upsertPermission(permissions, constants_1.PICO_PERMISSIONS.BOUNDARY, options.boundary);
    upsertPermission(permissions, constants_1.PICO_PERMISSIONS.CONTROLLER, options.picoSenseController);
    upsertPermission(permissions, constants_1.PICO_PERMISSIONS.MOTION_TRACKER, options.motionTracker);
    upsertPermission(permissions, constants_1.PICO_PERMISSIONS.HIGH_SAMPLING_RATE_SENSORS, options.highSamplingRateSensors);
    // ── Meta-data ───────────────────────────────────────────────────
    upsertMeta(metaData, constants_1.MANIFEST_META.FOVEATION_ENABLED, options.foveatedRendering ? 'true' : null);
    upsertMeta(metaData, constants_1.MANIFEST_META.REFRESH_RATES, options.refreshRates.length > 0 ? options.refreshRates.join(',') : null);
    // ── <uses-native-library> ───────────────────────────────────────
    // Declared at <application> scope. Renderer-agnostic — works the same
    // for `@reactvision/react-viro`'s OpenXR integration and for
    // Unity-as-a-Library. Opt out via `openXrLoaderDeclaration: false`
    // when the renderer bundles its own non-system loader.
    upsertNativeLibraries(application, options.openXrLoaderDeclaration);
    return manifest;
}
function upsertNativeLibraries(application, declare) {
    const list = ensureArray(application, 'uses-native-library');
    for (const lib of constants_1.PICO_NATIVE_LIBRARIES) {
        const idx = list.findIndex((entry) => entry.$?.['android:name'] === lib.name);
        if (!declare) {
            if (idx !== -1)
                list.splice(idx, 1);
            continue;
        }
        const entry = {
            $: {
                'android:name': lib.name,
                'android:required': lib.required ? 'true' : 'false',
            },
        };
        if (idx === -1)
            list.push(entry);
        else
            list[idx] = entry;
    }
}
function upsertFeature(features, name, enabled) {
    const idx = features.findIndex((f) => f.$?.['android:name'] === name);
    if (!enabled) {
        if (idx !== -1)
            features.splice(idx, 1);
        return;
    }
    const entry = {
        $: { 'android:name': name, 'android:required': 'false' },
    };
    if (idx === -1)
        features.push(entry);
    else
        features[idx] = entry;
}
function upsertPermission(permissions, name, enabled) {
    const idx = permissions.findIndex((p) => p.$?.['android:name'] === name);
    if (!enabled) {
        // Do not remove permissions that carry `tools:node="remove"` — those
        // were written by buildPicoManifest's telephony-strip path and we
        // must not undo them here.
        if (idx !== -1 && permissions[idx].$?.['tools:node'] !== 'remove') {
            permissions.splice(idx, 1);
        }
        return;
    }
    const entry = { $: { 'android:name': name } };
    if (idx === -1)
        permissions.push(entry);
    else
        permissions[idx] = entry;
}
function upsertMeta(metaData, name, value) {
    const idx = metaData.findIndex((m) => m.$?.['android:name'] === name);
    if (value == null) {
        if (idx !== -1)
            metaData.splice(idx, 1);
        return;
    }
    const entry = { $: { 'android:name': name, 'android:value': value } };
    if (idx === -1)
        metaData.push(entry);
    else
        metaData[idx] = entry;
}
function ensureArray(node, key) {
    if (!Array.isArray(node[key])) {
        node[key] = [];
    }
    return node[key];
}
function ensureApplication(manifest) {
    manifest.manifest.application = manifest.manifest.application ?? [];
    if (manifest.manifest.application.length === 0) {
        manifest.manifest.application.push({ $: {} });
    }
    return manifest.manifest.application[0];
}
exports.default = applyCapabilityContract;
//# sourceMappingURL=withPicoCapabilities.js.map