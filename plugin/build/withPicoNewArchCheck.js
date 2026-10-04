"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPicoNewArchCheck = void 0;
const config_plugins_1 = require("@expo/config-plugins");
const TAG = '@expo-pico/core';
/**
 * Soft-checks that the consuming app has the New Architecture enabled.
 *
 * Mirrors Viro's behavior — warns but never throws — because:
 *   1. PICO OS 6 native modules link against Fabric/Turbo Modules; the
 *      runtime detection module itself works under Legacy Architecture but
 *      `xrMode: 'pico-swan'` registration depends on the New Arch package
 *      registration shape that ships with RN ≥ 0.74.
 *   2. Throwing inside a config plugin terminates `npx expo prebuild` with a
 *      stack trace that is usually less useful than a clear warning that
 *      points the user at the right setting.
 *
 * Looks for either:
 *   - top-level `newArchEnabled: true`, or
 *   - `expo.newArchEnabled === true`.
 *
 * No-op when `xrMode === 'mobile'`.
 */
const withPicoNewArchCheck = (config, options) => {
    if (options.xrMode === 'mobile')
        return config;
    const newArchEnabled = config.newArchEnabled === true ||
        config.expo?.newArchEnabled === true;
    if (!newArchEnabled) {
        config_plugins_1.WarningAggregator.addWarningAndroid(TAG, `xrMode '${options.xrMode}' expects newArchEnabled: true. ` +
            'The Expo Modules v2 core module and the VR activity flag guard need the New Architecture. ' +
            "Set 'newArchEnabled: true' in app.config.{ts,js,json} (top-level).");
    }
    return config;
};
exports.withPicoNewArchCheck = withPicoNewArchCheck;
exports.default = exports.withPicoNewArchCheck;
//# sourceMappingURL=withPicoNewArchCheck.js.map