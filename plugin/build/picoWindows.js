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
exports.TRANSLUCENT_MAIN_WINDOW_META = exports.PANEL_ACTIVITY = exports.PANEL_POSITION = exports.POPUP_POSITION = exports.IMPLICIT_POSITION = exports.VR_POSITION_META = void 0;
exports.applyWindowContract = applyWindowContract;
exports.activityWindows = activityWindows;
exports.windowPositionProblems = windowPositionProblems;
exports.windowPositionError = windowPositionError;
exports.assertWindowPositions = assertWindowPositions;
exports.assertWindowPositionsOnDisk = assertWindowPositionsOnDisk;
const config_plugins_1 = require("@expo/config-plugins");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constants_1 = require("./constants");
/**
 * PICO OS 5 window rules, as read from framework.jar and services.jar on a
 * PICO 4 Ultra (OS 5.15.7):
 *
 * - Activities of one package share a 2D window when their
 *   `pico.vr.position` meta-data match. An activity without the key counts
 *   as "far". A second activity with the main window's value replaces the
 *   main window instead of opening beside it.
 * - "near" maps to window type 2002, a popup PICO hides on any click
 *   outside it.
 * - A third-party window takes its size only from the launch's
 *   ActivityOptions, never from `<layout>`.
 */
exports.VR_POSITION_META = 'pico.vr.position';
exports.IMPLICIT_POSITION = 'far';
exports.POPUP_POSITION = 'near';
/**
 * The panel activity's position. Any value PICO OS 5 does not map to a
 * window type gives the activity a window of its own with the main window's
 * type; "rail" is the value checked on a PICO 4 Ultra.
 */
exports.PANEL_POSITION = 'rail';
exports.PANEL_ACTIVITY = 'expo.modules.pico.PicoPanelActivity';
/**
 * Application meta-data the main-window listener reads. Written to the PICO
 * flavor manifest only, so it is absent from every other build.
 */
exports.TRANSLUCENT_MAIN_WINDOW_META = 'expo.modules.pico.TRANSLUCENT_MAIN_WINDOW';
const nameOf = (node) => node?.$?.['android:name'];
function applicationOf(manifest) {
    manifest.manifest.application = manifest.manifest.application ?? [];
    if (manifest.manifest.application.length === 0) {
        manifest.manifest.application.push({ $: {} });
    }
    return manifest.manifest.application[0];
}
function panelActivityElement() {
    return {
        $: {
            'android:name': exports.PANEL_ACTIVITY,
            'android:exported': 'false',
            'android:theme': '@style/AppTheme',
            'android:configChanges': 'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|density',
            'android:resizeableActivity': 'true',
            'android:excludeFromRecents': 'true',
            // A task of its own, so PICO gives the panel a window container of
            // its own instead of stacking it on the main window's task.
            'android:taskAffinity': '${applicationId}.picopanel',
        },
        'meta-data': [{ $: { 'android:name': exports.VR_POSITION_META, 'android:value': exports.PANEL_POSITION } }],
    };
}
/**
 * Writes the window defaults into the PICO flavor manifest: the
 * translucent-main-window flag and the panel activity, each removed again
 * when its option is off. Idempotent.
 */
function applyWindowContract(manifest, options) {
    const application = applicationOf(manifest);
    const meta = (application['meta-data'] ?? []).filter((m) => nameOf(m) !== exports.TRANSLUCENT_MAIN_WINDOW_META);
    if (options.windows.translucentMainWindow) {
        meta.push({ $: { 'android:name': exports.TRANSLUCENT_MAIN_WINDOW_META, 'android:value': 'true' } });
    }
    application['meta-data'] = meta;
    const activities = (application.activity ?? []).filter((a) => nameOf(a) !== exports.PANEL_ACTIVITY);
    if (options.windows.panelActivity)
        activities.push(panelActivityElement());
    application.activity = activities;
}
function metaValue(activity, key) {
    const entry = (activity['meta-data'] ?? []).find((m) => nameOf(m) === key);
    return entry?.$?.['android:value'];
}
/**
 * Each activity's window facts for the main manifest merged with one flavor
 * manifest. A flavor entry for the same activity overrides main's meta-data
 * values; `tools:node="remove"` drops the activity.
 */
function activityWindows(main, flavor) {
    const byName = new Map();
    for (const source of flavor ? [main, flavor] : [main]) {
        const app = (source.manifest.application?.[0] ?? {});
        for (const activity of (app.activity ?? [])) {
            const name = nameOf(activity);
            if (!name)
                continue;
            const node = activity.$?.['tools:node'];
            if (node === 'remove' || node === 'removeAll') {
                byName.delete(name);
                continue;
            }
            byName.set(name, node === 'replace' ? [activity] : [...(byName.get(name) ?? []), activity]);
        }
    }
    return [...byName.entries()].map(([name, layers]) => {
        const read = (key) => layers.reduce((value, layer) => metaValue(layer, key) ?? value, undefined);
        return {
            name,
            explicitPosition: read(exports.VR_POSITION_META),
            immersive: read(constants_1.MANIFEST_META.PVR_APP_TYPE) === 'vr',
        };
    });
}
/**
 * Problems with the activities' `pico.vr.position` values. The Gradle check
 * in android/pico-window-positions.gradle applies the same rules to each
 * variant's merged manifest.
 *
 * - An activity that sets "near" gets a popup window.
 * - An activity that sets a position shares the window of every other
 *   activity with the same position, the implicit "far" included.
 *
 * Activities that leave the key unset all share "far" and are not reported
 * against each other: that is how an ordinary Android app replaces its one
 * window. Immersive activities (`pvr.app.type=vr`) are skipped, because
 * PICO gives them the whole display, not a 2D window.
 */
function windowPositionProblems(windows) {
    const flat = windows.filter((w) => !w.immersive);
    const problems = [];
    for (const w of flat) {
        if (w.explicitPosition === undefined)
            continue;
        if (w.explicitPosition === exports.POPUP_POSITION) {
            problems.push(`${w.name} sets ${exports.VR_POSITION_META}="${exports.POPUP_POSITION}", which PICO OS shows as a popup ` +
                `that hides on any click outside it. Use a value of its own, such as "${exports.PANEL_POSITION}".`);
            continue;
        }
        const sharing = flat
            .filter((other) => other !== w)
            .filter((other) => (other.explicitPosition ?? exports.IMPLICIT_POSITION) === w.explicitPosition)
            .map((other) => other.name);
        if (sharing.length > 0) {
            problems.push(`${w.name} sets ${exports.VR_POSITION_META}="${w.explicitPosition}", the same window as ` +
                `${sharing.join(', ')}` +
                (w.explicitPosition === exports.IMPLICIT_POSITION
                    ? ` (an activity without the key counts as "${exports.IMPLICIT_POSITION}")`
                    : '') +
                `. PICO OS opens it in that window instead of a new one. Give each panel activity a ` +
                `distinct value.`);
        }
    }
    return problems;
}
function windowPositionError(where, problems) {
    return new Error(`[pico-window-positions] ${where}:\n- ${problems.join('\n- ')}`);
}
/** Throws when main (optionally merged with flavor) breaks a position rule. */
function assertWindowPositions(where, main, flavor) {
    const problems = windowPositionProblems(activityWindows(main, flavor));
    if (problems.length > 0)
        throw windowPositionError(where, problems);
}
/**
 * Checks app/src/main alone and with each app/src/<flavor> manifest on
 * disk. Library manifests are checked by the Gradle task, which reads the
 * merged result.
 */
async function assertWindowPositionsOnDisk(platformProjectRoot) {
    const srcDir = path.join(platformProjectRoot, 'app', 'src');
    const mainPath = path.join(srcDir, 'main', 'AndroidManifest.xml');
    if (!fs.existsSync(mainPath))
        return;
    const main = await config_plugins_1.AndroidConfig.Manifest.readAndroidManifestAsync(mainPath);
    assertWindowPositions('app/src/main/AndroidManifest.xml', main);
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === 'main')
            continue;
        const flavorPath = path.join(srcDir, entry.name, 'AndroidManifest.xml');
        if (!fs.existsSync(flavorPath))
            continue;
        const flavor = await config_plugins_1.AndroidConfig.Manifest.readAndroidManifestAsync(flavorPath);
        assertWindowPositions(`app/src/main + app/src/${entry.name} AndroidManifest.xml`, main, flavor);
    }
}
//# sourceMappingURL=picoWindows.js.map