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
exports.withQuestRenderModel = exports.RENDER_MODEL_FEATURE = exports.RENDER_MODEL_PERMISSION = void 0;
exports.rendererOverlayActive = rendererOverlayActive;
exports.applyQuestRenderModelEntries = applyQuestRenderModelEntries;
exports.syncQuestRenderModel = syncQuestRenderModel;
const config_plugins_1 = require("@expo/config-plugins");
// withFinalizedMod runs after every other mod, dangerous mods included.
// Imported via the deep path because some older @expo/config-plugins
// releases don't re-export it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const finalizedModExports = require('@expo/config-plugins/build/plugins/withFinalizedMod');
const withFinalizedMod = finalizedModExports.withFinalizedMod;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/** Meta permission that lets an app call `xrGetRenderModelPathsFB` / `xrLoadRenderModelFB`. */
exports.RENDER_MODEL_PERMISSION = 'com.oculus.permission.RENDER_MODEL';
/** Meta feature declared next to the permission; optional so the APK installs anywhere. */
exports.RENDER_MODEL_FEATURE = 'com.oculus.feature.RENDER_MODEL';
/**
 * True when `syncPicoOverlays` stages `libviro_renderer.so` into the quest
 * flavor. The RENDER_MODEL entries follow the same condition.
 */
function rendererOverlayActive(options) {
    return (options.xrMode !== 'mobile' && options.buildVariant !== 'mobile' && options.viroRendererOverlay);
}
/**
 * Adds (enabled) or removes (disabled) the RENDER_MODEL permission and
 * feature in a quest flavor manifest. Every other entry is left alone.
 * Returns true when the manifest changed.
 */
function applyQuestRenderModelEntries(manifest, enabled) {
    const before = JSON.stringify(manifest);
    const root = manifest.manifest;
    const isOurs = (e, name) => e.$?.['android:name'] === name;
    if (root['uses-permission']) {
        root['uses-permission'] = root['uses-permission'].filter((e) => !isOurs(e, exports.RENDER_MODEL_PERMISSION));
    }
    if (root['uses-feature']) {
        root['uses-feature'] = root['uses-feature'].filter((e) => !isOurs(e, exports.RENDER_MODEL_FEATURE));
    }
    if (enabled) {
        (root['uses-permission'] ?? (root['uses-permission'] = [])).unshift({ $: { 'android:name': exports.RENDER_MODEL_PERMISSION } });
        (root['uses-feature'] ?? (root['uses-feature'] = [])).unshift({
            $: { 'android:name': exports.RENDER_MODEL_FEATURE, 'android:required': 'false' },
        });
    }
    if (root['uses-permission']?.length === 0)
        delete root['uses-permission'];
    if (root['uses-feature']?.length === 0)
        delete root['uses-feature'];
    return JSON.stringify(manifest) !== before;
}
/**
 * Brings `app/src/quest/AndroidManifest.xml` in line with the renderer
 * overlay. The file is created only when there is something to add; with the
 * overlay off an existing file loses the two entries and nothing else.
 */
async function syncQuestRenderModel(platformRoot, options) {
    const enabled = rendererOverlayActive(options);
    const questPath = path.join(platformRoot, 'app', 'src', 'quest', 'AndroidManifest.xml');
    const exists = fs.existsSync(questPath);
    if (!exists && !enabled)
        return;
    const manifest = exists
        ? await config_plugins_1.AndroidConfig.Manifest.readAndroidManifestAsync(questPath)
        : {
            manifest: {
                $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
                queries: [],
            },
        };
    if (!applyQuestRenderModelEntries(manifest, enabled))
        return;
    if (!exists)
        fs.mkdirSync(path.dirname(questPath), { recursive: true });
    await config_plugins_1.AndroidConfig.Manifest.writeAndroidManifestAsync(questPath, manifest);
}
/**
 * Declares Meta's RENDER_MODEL permission and feature in the quest flavor
 * manifest while the renderer overlay is staged there. The overlay renderer
 * loads the runtime's own controller models through `XR_FB_render_model`,
 * which Horizon OS gates on this permission. PICO has no such extension, so
 * pico, dual, mobile and main never get either entry.
 *
 * Runs as a finalized mod: expo-horizon-core rewrites the quest manifest from
 * scratch in a dangerous mod, and dangerous mods registered later run
 * earlier, so a dangerous mod here could be overwritten.
 */
const withQuestRenderModel = (config, options) => withFinalizedMod(config, [
    'android',
    async (cfg) => {
        await syncQuestRenderModel(cfg.modRequest.platformProjectRoot, options);
        return cfg;
    },
]);
exports.withQuestRenderModel = withQuestRenderModel;
//# sourceMappingURL=withQuestRenderModel.js.map