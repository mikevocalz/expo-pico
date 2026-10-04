"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const { withPermissions } = config_plugins_1.AndroidConfig.Permissions;
/**
 * Config plugin for expo-pico-rtc.
 *
 * The library AndroidManifest.xml already declares RECORD_AUDIO,
 * MODIFY_AUDIO_SETTINGS, and BLUETOOTH_CONNECT via the AAR merge.
 * This plugin adds RECORD_AUDIO to the app's own manifest via
 * withPermissions so it appears in the merged output for all build variants,
 * not just the pico flavor.
 *
 * Does NOT inject Gradle flavors or Maven repos — core owns those.
 */
const withPicoRtc = (config, rawOptions) => {
    const options = { microphonePermission: true, ...(rawOptions ?? {}) };
    if (options.microphonePermission) {
        config = withPermissions(config, ['android.permission.RECORD_AUDIO']);
    }
    return config;
};
exports.default = withPicoRtc;
//# sourceMappingURL=withPicoRtc.js.map