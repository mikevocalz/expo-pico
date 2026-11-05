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
exports.withQuestPanelActivity = exports.PANEL_WIDTH_RANGE_DP = exports.PANEL_ACTIVITY = void 0;
exports.normalizeDetailPanel = normalizeDetailPanel;
exports.panelActivityElement = panelActivityElement;
exports.applyQuestPanelActivity = applyQuestPanelActivity;
exports.syncQuestPanelActivity = syncQuestPanelActivity;
const config_plugins_1 = require("@expo/config-plugins");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// withFinalizedMod runs after every other mod, dangerous mods included.
// Imported via the deep path because some older @expo/config-plugins
// releases don't re-export it.
const finalizedModExports = require('@expo/config-plugins/build/plugins/withFinalizedMod');
const withFinalizedMod = finalizedModExports.withFinalizedMod;
/**
 * @expo-pico/core's panel activity: a second surface on the app's one
 * ReactHost, opened with `PicoWindows.createPanelHost().openPanel(...)`.
 */
exports.PANEL_ACTIVITY = 'expo.modules.pico.PicoPanelActivity';
/** Meta's panel width range for a second activity panel (panel-sizing docs). */
exports.PANEL_WIDTH_RANGE_DP = { min: 384, max: 1440 };
function parseDp(field, value) {
    const match = /^(\d+(?:\.\d+)?)dp$/.exec(String(value));
    if (!match) {
        throw new Error(`[expo-horizon-quest] detailPanel.${field} must look like "420dp", got ${JSON.stringify(value)}.`);
    }
    return Number(match[1]);
}
/**
 * Validates `detailPanel`. Returns null when it is unset or false.
 *
 * @throws When a size is not a dp string or the width is outside Meta's range.
 */
function normalizeDetailPanel(value) {
    if (value === undefined || value === null || value === false)
        return null;
    const width = parseDp('defaultWidth', value.defaultWidth);
    parseDp('defaultHeight', value.defaultHeight);
    if (width < exports.PANEL_WIDTH_RANGE_DP.min || width > exports.PANEL_WIDTH_RANGE_DP.max) {
        throw new Error(`[expo-horizon-quest] detailPanel.defaultWidth ${width}dp is outside Meta's ` +
            `${exports.PANEL_WIDTH_RANGE_DP.min}-${exports.PANEL_WIDTH_RANGE_DP.max}dp panel range.`);
    }
    return { defaultWidth: value.defaultWidth, defaultHeight: value.defaultHeight };
}
/** The quest-manifest `<activity>` for the panel. Pure. */
function panelActivityElement(size) {
    return {
        $: {
            'android:name': exports.PANEL_ACTIVITY,
            'android:exported': 'false',
            'android:theme': '@style/AppTheme',
            'android:configChanges': 'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|density',
            'android:resizeableActivity': 'true',
            'android:excludeFromRecents': 'true',
            // A task of its own, so Horizon OS opens it as its own panel beside the
            // main one instead of stacking it on the main window's task.
            'android:taskAffinity': '${applicationId}.panel',
        },
        layout: [
            {
                $: {
                    'android:defaultWidth': size.defaultWidth,
                    'android:defaultHeight': size.defaultHeight,
                },
            },
        ],
    };
}
/**
 * Adds, replaces (size set) or removes (null) the panel activity in a parsed
 * quest manifest. Returns true when the manifest changed.
 */
function applyQuestPanelActivity(manifest, size) {
    const before = JSON.stringify(manifest);
    // expo-horizon-core owns the quest <application>; never invent one.
    const application = manifest.manifest.application?.[0];
    if (!application)
        return false;
    const activities = (application.activity ?? []).filter((a) => a.$?.['android:name'] !== exports.PANEL_ACTIVITY);
    if (size)
        activities.push(panelActivityElement(size));
    if (activities.length > 0)
        application.activity = activities;
    else
        delete application.activity;
    return JSON.stringify(manifest) !== before;
}
/** Brings app/src/quest/AndroidManifest.xml in line with `detailPanel`. */
async function syncQuestPanelActivity(platformRoot, options) {
    const questPath = path.join(platformRoot, 'app', 'src', 'quest', 'AndroidManifest.xml');
    if (!fs.existsSync(questPath))
        return;
    const manifest = await config_plugins_1.AndroidConfig.Manifest.readAndroidManifestAsync(questPath);
    if (!applyQuestPanelActivity(manifest, options.detailPanel))
        return;
    await config_plugins_1.AndroidConfig.Manifest.writeAndroidManifestAsync(questPath, manifest);
}
/**
 * Declares @expo-pico/core's panel activity in the quest flavor, sized by
 * `<layout>`, so `PicoWindows.isPanelAvailable` is true there and a detail
 * panel opens beside the main panel (Meta's multi-panel activity launch).
 *
 * A finalized mod because expo-horizon-core rewrites the quest manifest in a
 * dangerous mod.
 */
const withQuestPanelActivity = (config, options) => withFinalizedMod(config, [
    'android',
    async (cfg) => {
        await syncQuestPanelActivity(cfg.modRequest.platformProjectRoot, options);
        return cfg;
    },
]);
exports.withQuestPanelActivity = withQuestPanelActivity;
//# sourceMappingURL=withQuestPanelActivity.js.map