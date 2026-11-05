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
exports.withPicoMainApplication = void 0;
exports.injectIntoKotlinMainApplication = injectIntoKotlinMainApplication;
exports.usesViroVrActivity = usesViroVrActivity;
exports.injectIntoJavaMainApplication = injectIntoJavaMainApplication;
const config_plugins_1 = require("@expo/config-plugins");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constants_1 = require("./constants");
const insertLinesHelper_1 = require("./util/insertLinesHelper");
/**
 * MainApplication edits for PICO builds (`xrMode` other than `'mobile'`) and for
 * any build that has react-viro's `VRActivity` (`usesViroVrActivity`):
 *
 *   - Adds the New Architecture flag guard for the Viro VR activity hop
 *     (Kotlin only; see `injectNewArchFlagGuard`).
 *   - Strips the `PicoCorePackage` registration older prebuilds injected.
 *     React Native autolinking registers it (see react-native.config.js).
 *   - Installs `ImmersiveActivityTracker` from `Application.onCreate` (see
 *     `injectTrackerInstall`).
 */
const withPicoMainApplication = (config, options) => {
    if (options.xrMode === 'mobile' && !usesViroVrActivity(config)) {
        return config;
    }
    return (0, config_plugins_1.withMainApplication)(config, (config) => {
        const language = config.modResults.language;
        const original = config.modResults.contents;
        const updated = language === 'java'
            ? injectIntoJavaMainApplication(original, options)
            : injectIntoKotlinMainApplication(original, options);
        config.modResults.contents = updated ?? original;
        return config;
    });
};
exports.withPicoMainApplication = withPicoMainApplication;
function injectIntoKotlinMainApplication(source, _options) {
    return injectNewArchFlagGuard(injectTrackerInstall(stripLegacyPackageRegistration(source), 'kotlin'));
}
const VIRO_PACKAGE = '@reactvision/react-viro';
/**
 * True when `@reactvision/react-viro` is a config plugin, which generates the
 * immersive `VRActivity` that shares the app's ReactHost. A quest-only app
 * (no `picoAppId`, so `xrMode` stays `'mobile'`) has that activity too and
 * needs the flag guard: without it, entering XR on a Quest 3S crashed with
 * `AssertionError: Pausing an activity that is not the current activity ...
 * Current activity: VRActivity Paused activity: MainActivity`.
 *
 * Matches the package name, a subpath of it, a relative or absolute path into
 * the package, and the plugin function itself.
 */
function usesViroVrActivity(config) {
    const root = config._internal?.projectRoot;
    const projectRoot = typeof root === 'string' ? root : process.cwd();
    return (config.plugins ?? []).some((entry) => {
        const plugin = Array.isArray(entry) ? entry[0] : entry;
        if (typeof plugin === 'string')
            return pluginPackageName(plugin, projectRoot) === VIRO_PACKAGE;
        if (typeof plugin === 'function')
            return plugin === viroPluginFunction(projectRoot);
        return false;
    });
}
/** The npm package a string plugin entry belongs to, or null if none is found. */
function pluginPackageName(entry, projectRoot) {
    if (!entry.startsWith('.') && !path.isAbsolute(entry)) {
        const parts = entry.split('/');
        return entry.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
    }
    let dir = path.resolve(projectRoot, entry);
    while (dir !== path.dirname(dir)) {
        const pkgJson = path.join(dir, 'package.json');
        if (fs.existsSync(pkgJson)) {
            try {
                return JSON.parse(fs.readFileSync(pkgJson, 'utf8')).name ?? null;
            }
            catch {
                return null;
            }
        }
        dir = path.dirname(dir);
    }
    return null;
}
/** react-viro's config plugin function as the project resolves it, or null. */
function viroPluginFunction(projectRoot) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(require.resolve(`${VIRO_PACKAGE}/app.plugin.js`, { paths: [projectRoot] }));
        // The same unwrap Expo applies when it loads a plugin module.
        return mod.default ?? mod;
    }
    catch {
        return null;
    }
}
/**
 * Removes the `PicoCorePackage` registration and its imports that older
 * prebuilds injected. React Native autolinking now adds `new PicoCorePackage()`
 * to the PackageList, and the package reads its platform from
 * `BuildConfig.PICO_XR_MODE`, which is correct per flavor. A leftover manual
 * line would register the package a second time.
 */
function stripLegacyPackageRegistration(source) {
    const withoutCall = stripLineWithMarker(source, constants_1.PICO_MAIN_APP_MARKER);
    return stripLineWithMarker(withoutCall, constants_1.PICO_MAIN_APP_IMPORT_MARKER, 2);
}
/**
 * Keeps `skipActivityIdentityAssertionOnHostPause` on for the whole process,
 * without dropping the app back to the old architecture.
 *
 * react-viro launches its immersive `VRActivity` in a separate task, so
 * `MainActivity.onPause` is delivered late — after `VRActivity.onResume` has
 * already promoted the shared ReactHost. `ReactHostImpl.onHostPause` then sees a
 * different current activity. react-viro's `VRLauncherModule` sets the flag that
 * downgrades that assertion just before `startActivity`, but under Expo the pause
 * runs in a coroutine, so a per-launch set can land too late. Setting it once at
 * startup makes the ordering irrelevant.
 *
 * The trap this exists to prevent: `dangerouslyForceOverride` REPLACES the flag
 * provider wholesale, so overriding
 * `ReactNativeFeatureFlagsDefaults` — which reports `enableBridgelessArchitecture`
 * as false — silently reverts the app to the bridge. `ReactHost` then never
 * starts: a blank screen, Metro never asked for the bundle, and not one exception
 * in logcat. Extending `ReactNativeNewArchitectureFeatureFlagsDefaults` keeps
 * every new-arch flag at the value `DefaultNewArchitectureEntryPoint` chose, and
 * picks up flags added by future React Native releases that a hand-written list
 * would miss.
 *
 * Placement is load-bearing in both directions: it must come AFTER
 * `loadReactNative`, which maps the JNI the C++ flag accessor needs (before it,
 * `ReactNativeFeatureFlagsCxxInterop.<clinit>` throws), and it must use the
 * forcing variant, since `loadReactNative` has already registered a provider and
 * plain `override()` rejects a second one.
 */
function injectNewArchFlagGuard(source) {
    const guardBlock = `    ${constants_1.PICO_MAIN_APP_FLAGS_MARKER}\n` +
        `    ReactNativeFeatureFlags.dangerouslyForceOverride(\n` +
        `        object : ReactNativeNewArchitectureFeatureFlagsDefaults() {\n` +
        `          override fun skipActivityIdentityAssertionOnHostPause(): Boolean = true\n` +
        `        })`;
    // Drop the whole block a previous run wrote, not only its first line.
    let contents = stripLineWithMarker(source, constants_1.PICO_MAIN_APP_FLAGS_MARKER, guardBlock.split('\n').length - 1);
    const inserted = (0, insertLinesHelper_1.insertLinesAfter)(contents, guardBlock, 'loadReactNative(this)');
    if (!inserted) {
        console.warn('[expo-pico-core] Could not find `loadReactNative(this)` in MainApplication.kt; ' +
            'skipped the New Architecture flag guard. Entering the Viro VR activity may ' +
            'stop timers and Fast Refresh.');
        return contents;
    }
    contents = inserted;
    return (0, insertLinesHelper_1.insertImportAfterPackage)(contents, `${constants_1.PICO_MAIN_APP_FLAGS_IMPORT_MARKER}\n` +
        'import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags\n' +
        'import com.facebook.react.internal.featureflags.ReactNativeNewArchitectureFeatureFlagsDefaults');
}
function injectIntoJavaMainApplication(source, _options) {
    return injectTrackerInstall(stripLegacyPackageRegistration(source), 'java');
}
/**
 * Installs `ImmersiveActivityTracker` right after `super.onCreate()`, before
 * any activity exists. `requestImmersivePermission` asks the tracker for the
 * live immersive activity. `PicoCorePackage.createNativeModules` also
 * installs it, but only once React starts, so a `VRActivity` the system
 * restored before that was never recorded. `install` is idempotent and
 * registers nothing in a build without a marked immersive activity.
 */
function injectTrackerInstall(source, language) {
    const semi = language === 'java' ? ';' : '';
    const anchor = `super.onCreate()${semi}`;
    const block = `    ${constants_1.PICO_MAIN_APP_TRACKER_MARKER}\n` + `    ImmersiveActivityTracker.install(this)${semi}`;
    const inserted = (0, insertLinesHelper_1.insertLinesAfter)(source, block, anchor);
    if (!inserted) {
        console.warn(`[expo-pico-core] Could not find \`${anchor}\` in MainApplication; the immersive ` +
            'activity tracker installs when React starts instead, and misses a VRActivity ' +
            'restored before that.');
        return source;
    }
    return (0, insertLinesHelper_1.insertImportAfterPackage)(inserted, `${constants_1.PICO_MAIN_APP_TRACKER_IMPORT_MARKER}\n` +
        `import com.margelo.nitro.expopico.picocore.ImmersiveActivityTracker${semi}`);
}
/**
 * Removes the marker comment line and the `following` lines after it (the
 * call or imports it labels). Returns the original string if the marker is
 * not present.
 */
function stripLineWithMarker(source, marker, following = 1) {
    if (!source.includes(marker)) {
        return source;
    }
    const lines = source.split('\n');
    const idx = lines.findIndex((line) => line.includes(marker));
    if (idx === -1 || idx + following >= lines.length) {
        return source;
    }
    const before = lines.slice(0, idx);
    const after = lines.slice(idx + 1 + following);
    return [...before, ...after].join('\n');
}
exports.default = exports.withPicoMainApplication;
//# sourceMappingURL=withPicoMainApplication.js.map