"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPicoNitroModules = exports.PICO_NATIVE_PACKAGES = exports.PICO_NITRO_DEPS_MARKER = exports.PICO_NITRO_INCLUDE_MARKER = void 0;
exports.stripIncludeBlock = stripIncludeBlock;
exports.stripDependencyBlock = stripDependencyBlock;
const config_plugins_1 = require("@expo/config-plugins");
exports.PICO_NITRO_INCLUDE_MARKER = '// expo-pico-core: @expo-pico/* Nitro module inclusion';
exports.PICO_NITRO_DEPS_MARKER = '// expo-pico-core: @expo-pico/* module dependencies';
/**
 * Every package in the family that ships an Android Gradle module.
 *
 * `@expo-pico/app-kit` is absent deliberately — it is TypeScript only. Kept
 * in step with `NITRO_ONLOAD_CLASSES` in `android/src/nitro/PicoCorePackage.kt`.
 */
exports.PICO_NATIVE_PACKAGES = [
    '@expo-pico/account',
    '@expo-pico/achievements',
    '@expo-pico/core',
    '@expo-pico/iap',
    '@expo-pico/leaderboards',
    '@expo-pico/notifications',
    '@expo-pico/rooms',
    '@expo-pico/rtc',
    '@expo-pico/social',
    '@expo-pico/spatial',
    '@expo-pico/storage',
    '@expo-pico/subscription',
];
/**
 * Removes the `include` block this plugin used to append to settings.gradle.
 *
 * The block starts at {@link PICO_NITRO_INCLUDE_MARKER}, continues through its
 * comment lines, and ends after the last `include ':expo-pico-*'` /
 * `project(':expo-pico-*').projectDir` line. Returns the input unchanged when
 * the marker is absent.
 */
function stripIncludeBlock(contents) {
    const lines = contents.split('\n');
    const start = lines.findIndex((line) => line.trim() === exports.PICO_NITRO_INCLUDE_MARKER);
    if (start === -1)
        return contents;
    let end = start + 1;
    while (end < lines.length &&
        (lines[end].startsWith('//') ||
            /^include ':expo-pico-[\w-]+'$/.test(lines[end].trim()) ||
            /^project\(':expo-pico-[\w-]+'\)\.projectDir = /.test(lines[end].trim()))) {
        end += 1;
    }
    // The block was appended after a blank line; drop that too.
    const from = start > 0 && lines[start - 1].trim() === '' ? start - 1 : start;
    return [...lines.slice(0, from), ...lines.slice(end)].join('\n');
}
/**
 * Removes the `dependencies { implementation project(':expo-pico-*') }` block
 * this plugin used to append to app/build.gradle. Returns the input unchanged
 * when the marker is absent.
 */
function stripDependencyBlock(contents) {
    const escaped = exports.PICO_NITRO_DEPS_MARKER.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    const block = new RegExp(`\\n*${escaped}\\ndependencies \\{\\n(?:\\s*implementation project\\(':expo-pico-[\\w-]+'\\)\\n)*\\}\\n?`);
    return contents.replace(block, '\n');
}
/**
 * Removes what earlier versions of this plugin wrote to the Gradle files.
 *
 * Those versions included every installed `@expo-pico/*` Android module in
 * settings.gradle as `:expo-pico-<name>` and added it to the app's
 * dependencies, because the packages had no autolinking entry. Each package
 * now ships a `react-native.config.js` and a `ReactPackage`, so React Native
 * autolinking includes it (as `:expo-pico_<name>`) whether or not this plugin
 * is configured. A leftover block from a prebuild without `--clean` would
 * include the same directory a second time under the old name, and Gradle
 * would compile the module twice into one APK.
 */
const withPicoNitroModules = (config, options) => {
    if (!options.enabled)
        return config;
    config = (0, config_plugins_1.withAppBuildGradle)(config, (cfg) => {
        cfg.modResults.contents = stripDependencyBlock(cfg.modResults.contents);
        return cfg;
    });
    return (0, config_plugins_1.withSettingsGradle)(config, (cfg) => {
        cfg.modResults.contents = stripIncludeBlock(cfg.modResults.contents);
        return cfg;
    });
};
exports.withPicoNitroModules = withPicoNitroModules;
exports.default = exports.withPicoNitroModules;
//# sourceMappingURL=withPicoNitroModules.js.map