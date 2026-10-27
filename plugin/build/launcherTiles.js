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
exports.VIRO_VR_ACTION = exports.LAUNCHER_VISIBLE_CATEGORIES = exports.MAIN_ACTION = void 0;
exports.isLauncherVisibleFilter = isLauncherVisibleFilter;
exports.launcherVisibleActivities = launcherVisibleActivities;
exports.launcherTileError = launcherTileError;
exports.assertAtMostOneLauncherTile = assertAtMostOneLauncherTile;
exports.moveVRActivityOffMain = moveVRActivityOffMain;
exports.moveVRActivityOffMainOnDisk = moveVRActivityOffMainOnDisk;
exports.assertOneLauncherTileOnDisk = assertOneLauncherTileOnDisk;
exports.applyMarkedGradleScript = applyMarkedGradleScript;
exports.applyOneLauncherTileGradle = applyOneLauncherTileGradle;
exports.resolveCoreGradleScript = resolveCoreGradleScript;
exports.resolveOneLauncherTileScript = resolveOneLauncherTileScript;
const config_plugins_1 = require("@expo/config-plugins");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * One launcher tile per app.
 *
 * PICO OS and Horizon OS list every activity whose intent-filter pairs
 * `android.intent.action.MAIN` with one of LAUNCHER_VISIBLE_CATEGORIES. This
 * plugin used to give Viro's `.VRActivity` MAIN plus the PICO/OpenXR
 * categories, so a PICO 4 Ultra showed the app twice. VRActivity is started
 * by an explicit intent and PICO runs it immersive with no intent-filter at
 * all (checked on a PICO 4 Ultra, OS 5.15.7), so it needs none.
 *
 * The rule: exactly one activity in an app may be launcher-visible.
 */
exports.MAIN_ACTION = 'android.intent.action.MAIN';
/** Categories that put a MAIN activity in a phone or headset app library. */
exports.LAUNCHER_VISIBLE_CATEGORIES = [
    'android.intent.category.LAUNCHER',
    'com.oculus.intent.category.VR',
    'com.pico.intent.category.VR',
    'com.picovr.intent.category.VR',
    'org.khronos.openxr.intent.category.IMMERSIVE_HMD',
];
const nameOf = (node) => node?.$?.['android:name'];
/** True when `filter` lists MAIN and at least one launcher-visible category. */
function isLauncherVisibleFilter(filter) {
    const actions = filter.action ?? [];
    const categories = filter.category ?? [];
    return (actions.some((a) => nameOf(a) === exports.MAIN_ACTION) &&
        categories.some((c) => exports.LAUNCHER_VISIBLE_CATEGORIES.includes(nameOf(c) ?? '')));
}
function activitiesOf(manifest) {
    const app = (manifest.manifest.application?.[0] ?? {});
    return [...(app.activity ?? []), ...(app['activity-alias'] ?? [])];
}
/**
 * Launcher-visible activity names for the main manifest merged with one
 * flavor manifest. Approximates the manifest merger: an activity counts when
 * either file gives it a launcher-visible filter, unless the flavor removes
 * the activity, replaces it, or drops its filters with
 * `<intent-filter tools:node="removeAll"/>`.
 */
function launcherVisibleActivities(main, flavor) {
    const names = new Set();
    for (const activity of activitiesOf(main)) {
        const filters = activity['intent-filter'] ?? [];
        if (filters.some(isLauncherVisibleFilter))
            names.add(nameOf(activity) ?? '(unnamed)');
    }
    if (!flavor)
        return [...names];
    for (const activity of activitiesOf(flavor)) {
        const name = nameOf(activity);
        if (!name)
            continue;
        const node = activity.$?.['tools:node'];
        const filters = activity['intent-filter'] ?? [];
        if (node === 'remove' || node === 'removeAll') {
            names.delete(name);
            continue;
        }
        if (node === 'replace' || filters.some((f) => f.$?.['tools:node'] === 'removeAll')) {
            names.delete(name);
        }
        if (filters.some(isLauncherVisibleFilter))
            names.add(name);
    }
    return [...names];
}
function launcherTileError(where, names) {
    return new Error(`[one-launcher-tile] ${where} declares ${names.length} launcher-visible activities ` +
        `(${names.join(', ')}). PICO OS and Horizon OS show one app-library tile per ` +
        `activity whose intent-filter pairs ${exports.MAIN_ACTION} with one of ` +
        `${exports.LAUNCHER_VISIBLE_CATEGORIES.join(', ')}. Exactly one activity may do that. ` +
        `Start immersive activities with an explicit intent and give their headset ` +
        `categories a non-MAIN action such as com.viro.intent.action.VR.`);
}
/** Throws when `main` (optionally merged with `flavor`) has more than one tile. */
function assertAtMostOneLauncherTile(where, main, flavor) {
    const names = launcherVisibleActivities(main, flavor);
    if (names.length > 1)
        throw launcherTileError(where, names);
}
/** The action Viro's immersive activity answers to once it no longer uses MAIN. */
exports.VIRO_VR_ACTION = 'com.viro.intent.action.VR';
const VR_ACTIVITY_NAMES = ['.VRActivity', 'com.viro.core.VRActivity'];
/**
 * Gives `.VRActivity` `com.viro.intent.action.VR` in place of MAIN in every
 * launcher-visible intent-filter, keeping its categories. Every published
 * @reactvision/react-viro (2.58 to 3.0.x) writes MAIN plus
 * com.oculus.intent.category.VR there, which makes the activity a second
 * library tile. Viro starts it by explicit intent, so MAIN is never used.
 * Returns true when the manifest changed.
 */
function moveVRActivityOffMain(manifest) {
    let changed = false;
    for (const activity of activitiesOf(manifest)) {
        if (!VR_ACTIVITY_NAMES.includes(nameOf(activity) ?? ''))
            continue;
        for (const filter of (activity['intent-filter'] ?? [])) {
            if (!isLauncherVisibleFilter(filter))
                continue;
            filter.action = filter.action.map((action) => nameOf(action) === exports.MAIN_ACTION ? { $: { 'android:name': exports.VIRO_VR_ACTION } } : action);
            changed = true;
        }
    }
    return changed;
}
/** Applies {@link moveVRActivityOffMain} to app/src/main/AndroidManifest.xml on disk. */
async function moveVRActivityOffMainOnDisk(platformProjectRoot) {
    const mainPath = path.join(platformProjectRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
    if (!fs.existsSync(mainPath))
        return;
    const main = await config_plugins_1.AndroidConfig.Manifest.readAndroidManifestAsync(mainPath);
    if (moveVRActivityOffMain(main)) {
        await config_plugins_1.AndroidConfig.Manifest.writeAndroidManifestAsync(mainPath, main);
    }
}
/**
 * Reads app/src/main and every app/src/<flavor> manifest on disk and throws
 * when main alone, or main plus any one flavor, has more than one
 * launcher-visible activity. Library manifests are checked by the Gradle
 * task in android/one-launcher-tile.gradle, which reads the merged result.
 */
async function assertOneLauncherTileOnDisk(platformProjectRoot) {
    const srcDir = path.join(platformProjectRoot, 'app', 'src');
    const mainPath = path.join(srcDir, 'main', 'AndroidManifest.xml');
    if (!fs.existsSync(mainPath))
        return;
    const main = await config_plugins_1.AndroidConfig.Manifest.readAndroidManifestAsync(mainPath);
    assertAtMostOneLauncherTile('app/src/main/AndroidManifest.xml', main);
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === 'main')
            continue;
        const flavorPath = path.join(srcDir, entry.name, 'AndroidManifest.xml');
        if (!fs.existsSync(flavorPath))
            continue;
        const flavor = await config_plugins_1.AndroidConfig.Manifest.readAndroidManifestAsync(flavorPath);
        assertAtMostOneLauncherTile(`app/src/main + app/src/${entry.name} AndroidManifest.xml`, main, flavor);
    }
}
const GRADLE_MARKER = '// @expo-pico/core: one launcher tile check';
/**
 * Returns app/build.gradle with exactly one `apply from: "<scriptPath>"`
 * line under `marker` at the end, dropping any earlier copy of that pair.
 * Idempotent; a changed path replaces the old one.
 */
function applyMarkedGradleScript(contents, marker, scriptFile, scriptPath) {
    const lines = contents.split('\n');
    const kept = lines
        .filter((line, i) => {
        if (line.trim() === marker)
            return false;
        return !(lines[i - 1]?.trim() === marker && line.includes(scriptFile));
    })
        .join('\n')
        .replace(/\n+$/, '');
    return `${kept}\n\n${marker}\napply from: "${scriptPath}"\n`;
}
/**
 * Returns app/build.gradle with exactly one `apply from:` line for
 * android/one-launcher-tile.gradle at the end. `scriptPath` is relative to
 * the app module directory. Idempotent.
 */
function applyOneLauncherTileGradle(contents, scriptPath) {
    return applyMarkedGradleScript(contents, GRADLE_MARKER, 'one-launcher-tile.gradle', scriptPath);
}
/**
 * Path of a script in this package's android/ directory relative to the app
 * module directory, with POSIX separators for Gradle.
 */
function resolveCoreGradleScript(projectRoot, appModuleDir, fileName) {
    let packageDir = path.resolve(__dirname, '..', '..');
    try {
        packageDir = path.dirname(require.resolve('@expo-pico/core/package.json', { paths: [projectRoot] }));
    }
    catch {
        // Not resolvable from the app (tests, linked checkouts): use this file's package.
    }
    const script = path.join(packageDir, 'android', fileName);
    return path.relative(appModuleDir, script).split(path.sep).join('/');
}
/** {@link resolveCoreGradleScript} for android/one-launcher-tile.gradle. */
function resolveOneLauncherTileScript(projectRoot, appModuleDir) {
    return resolveCoreGradleScript(projectRoot, appModuleDir, 'one-launcher-tile.gradle');
}
//# sourceMappingURL=launcherTiles.js.map