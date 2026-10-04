"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
/**
 * Config plugin for expo-pico-rooms.
 *
 * Declares the PICO social/platform permission needed for room and
 * matchmaking APIs. Does NOT inject flavors or Maven repos — core owns those.
 *
 * No config options needed — the permission is always required when using rooms.
 */
const withPicoRooms = (config) => {
    return (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        const manifest = config.modResults.manifest;
        if (!manifest['uses-permission'])
            manifest['uses-permission'] = [];
        const PICO_SOCIAL_PERMISSION = 'com.picovr.platform.permission.SOCIAL';
        const exists = manifest['uses-permission'].some((p) => p.$?.['android:name'] === PICO_SOCIAL_PERMISSION);
        if (!exists) {
            manifest['uses-permission'].push({
                $: { 'android:name': PICO_SOCIAL_PERMISSION },
            });
        }
        return config;
    });
};
exports.default = withPicoRooms;
//# sourceMappingURL=withPicoRooms.js.map