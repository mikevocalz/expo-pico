"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPicoMainApplication = void 0;
exports.injectIntoKotlinMainApplication = injectIntoKotlinMainApplication;
exports.injectIntoJavaMainApplication = injectIntoJavaMainApplication;
const config_plugins_1 = require("@expo/config-plugins");
const constants_1 = require("./constants");
const insertLinesHelper_1 = require("./util/insertLinesHelper");
/**
 * MainApplication edits for PICO builds (`xrMode` other than `'mobile'`):
 *
 *   - Adds the New Architecture flag guard for the Viro VR activity hop
 *     (Kotlin only; see `injectNewArchFlagGuard`).
 *   - Strips the `PicoCorePackage` registration older prebuilds injected.
 *     Core is an autolinked Expo Module, so it needs no manual registration.
 */
const withPicoMainApplication = (config, options) => {
    if (options.xrMode === 'mobile') {
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
    return injectNewArchFlagGuard(stripLegacyPackageRegistration(source));
}
/**
 * Removes the `PicoCorePackage` registration and its imports that older
 * prebuilds injected. Core is an autolinked Expo Module now and reads its
 * platform from `BuildConfig.PICO_XR_MODE`, so nothing registers it by hand;
 * the old lines reference classes that no longer exist and fail to compile.
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
    let contents = stripLineWithMarker(source, constants_1.PICO_MAIN_APP_FLAGS_MARKER);
    const guardBlock = `    ${constants_1.PICO_MAIN_APP_FLAGS_MARKER}\n` +
        `    ReactNativeFeatureFlags.dangerouslyForceOverride(\n` +
        `        object : ReactNativeNewArchitectureFeatureFlagsDefaults() {\n` +
        `          override fun skipActivityIdentityAssertionOnHostPause(): Boolean = true\n` +
        `        })`;
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
    return stripLegacyPackageRegistration(source);
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