"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyVRActivityContract = applyVRActivityContract;
exports.applyPanelSize = applyPanelSize;
const constants_1 = require("./constants");
/**
 * Reference to the Viro plugin's auto-generated immersive activity. The
 * `@reactvision/react-viro` Expo plugin always emits `.VRActivity` in the
 * app's package when `xRMode` includes `QUEST` (and now `PICO`). Our PICO
 * manifest overlay merges into that activity to add the categories and
 * meta-data PICO OS needs to grant exclusive OpenXR display access.
 *
 * Architecture: `MainActivity` stays a 2D panel app (window-container or
 * 2D launcher). The user enters immersive XR via a button that mounts
 * `ViroXRSceneNavigator`, which sets the scene intent on the shared JS
 * bridge and calls `VRLauncher.launchVRScene()` → starts `.VRActivity` →
 * VRActivity mounts `"VRQuestScene"` (auto-registered by @reactvision/
 * react-viro to `ViroQuestEntryPoint`) → that renders ViroVRSceneNavigator
 * with the intent's scene. MainActivity stays alive in the back stack;
 * back-press in VR returns to the panel.
 */
const VR_ACTIVITY_NAME = '.VRActivity';
/**
 * Add the PICO launcher categories + spatial meta-data to `.VRActivity` so
 * PICO OS treats it as the immersive entry point for this app. Idempotent.
 *
 * Mutates:
 *   1. `.VRActivity` <intent-filter>: add `com.pvr.intent.category.VR`
 *      (PICO modern) + `com.picovr.intent.category.VR` (legacy) so the
 *      activity is reachable as an immersive target.
 *   2. `.VRActivity` <meta-data>: add `com.pico.spatial.mode=immersive`
 *      + `com.pico.spatial.containerMode=immersive` so the activity gets
 *      the exclusive HMD surface (not a 2D window-container).
 *   3. `.VRActivity` <meta-data>: add `pvr.app.type=vr` activity-scope
 *      override so PICO enumerates VRActivity as immersive even when the
 *      app-level type is `mr` (panel + immersive coexist).
 *
 * Gated on `appType` being `vr` or `mr` — only those flavors host an XR
 * scene worth routing PICO immersive into.
 */
function applyVRActivityContract(manifest, options) {
    if (options.appType !== 'vr' && options.appType !== 'mr') {
        return manifest;
    }
    ensureToolsNamespace(manifest);
    const application = ensureApplication(manifest);
    application.activity = application.activity ?? [];
    let activity = application.activity.find((a) => a.$?.['android:name'] === VR_ACTIVITY_NAME);
    if (!activity) {
        activity = {
            $: { 'android:name': VR_ACTIVITY_NAME, 'tools:node': 'merge' },
        };
        application.activity.push(activity);
    }
    else if (!activity.$?.['tools:node']) {
        activity.$ = { ...activity.$, 'tools:node': 'merge' };
    }
    addPicoIntentCategories(activity);
    // 'full-space' is PICO OS 6's full-environment-takeover mode. 'immersive'
    // is the legacy pre-OS6 value and on OS 6 only gives a contained
    // immersive surface — splats render as a 3D object in front rather than
    // surrounding the user. 'full-space' grants the entire HMD FoV.
    upsertActivityMeta(activity, constants_1.MANIFEST_META.SPATIAL_MODE, 'full-space');
    upsertActivityMeta(activity, constants_1.MANIFEST_META.PVR_APP_TYPE, 'vr');
    return manifest;
}
function addPicoIntentCategories(activity) {
    activity['intent-filter'] = activity['intent-filter'] ?? [];
    // The Viro plugin emits the Oculus VR intent-filter on this activity.
    // We add a parallel PICO-categories filter so the manifest merger keeps
    // both. PICO and Quest are mutually exclusive at runtime — only the
    // matching runtime resolves its category.
    const marker = constants_1.LAUNCHER_CATEGORIES.PICO_VR;
    const existingIdx = activity['intent-filter'].findIndex((f) => Array.isArray(f.category) && f.category.some((c) => c.$?.['android:name'] === marker));
    const filter = {
        action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
        category: [
            { $: { 'android:name': constants_1.LAUNCHER_CATEGORIES.PICO_VR } },
            { $: { 'android:name': constants_1.LAUNCHER_CATEGORIES.PICOVR_VR_LEGACY } },
            { $: { 'android:name': constants_1.LAUNCHER_CATEGORIES.OPENXR_IMMERSIVE_HMD } },
        ],
    };
    if (existingIdx === -1) {
        activity['intent-filter'].push(filter);
    }
    else {
        activity['intent-filter'][existingIdx] = filter;
    }
}
function upsertActivityMeta(activity, name, value) {
    activity['meta-data'] = activity['meta-data'] ?? [];
    const existing = activity['meta-data'].find((m) => m.$?.['android:name'] === name);
    if (existing) {
        existing.$['android:value'] = value;
    }
    else {
        activity['meta-data'].push({
            $: { 'android:name': name, 'android:value': value },
        });
    }
}
/**
 * Emit `<layout android:defaultWidth="…" android:defaultHeight="…"/>` on
 * `.MainActivity` when the user sets the Horizon-parity panel size in the
 * plugin options. Mirrors expo-horizon-core's `withPanelSize`. Idempotent:
 * re-applying replaces existing `<layout>` attrs with current values.
 *
 * Skipped when neither dimension is provided — leaves PICO's default
 * window-container sizing in effect.
 */
function applyPanelSize(manifest, options) {
    if (!options.defaultWidth && !options.defaultHeight) {
        return manifest;
    }
    const application = ensureApplication(manifest);
    application.activity = application.activity ?? [];
    let activity = application.activity.find((a) => a.$?.['android:name'] === '.MainActivity');
    if (!activity) {
        activity = {
            $: { 'android:name': '.MainActivity', 'tools:node': 'merge' },
        };
        application.activity.push(activity);
    }
    else if (!activity.$?.['tools:node']) {
        activity.$ = { ...activity.$, 'tools:node': 'merge' };
    }
    const attrs = {};
    if (options.defaultWidth)
        attrs['android:defaultWidth'] = options.defaultWidth;
    if (options.defaultHeight)
        attrs['android:defaultHeight'] = options.defaultHeight;
    activity.layout = [{ $: attrs }];
    return manifest;
}
function ensureToolsNamespace(manifest) {
    const root = manifest.manifest;
    root.$ = root.$ ?? {};
    if (!root.$['xmlns:tools']) {
        root.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    if (!root.$['xmlns:android']) {
        root.$['xmlns:android'] = 'http://schemas.android.com/apk/res/android';
    }
}
function ensureApplication(manifest) {
    manifest.manifest.application = manifest.manifest.application ?? [];
    if (manifest.manifest.application.length === 0) {
        manifest.manifest.application.push({ $: {} });
    }
    return manifest.manifest.application[0];
}
exports.default = applyVRActivityContract;
//# sourceMappingURL=withPicoVRActivity.js.map