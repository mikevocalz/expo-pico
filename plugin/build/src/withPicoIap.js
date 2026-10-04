"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const PICO_BILLING_PERMISSION = 'com.picovr.payment.BILLING';
/**
 * Config plugin for expo-pico-iap.
 *
 * Adds the PICO billing permission to AndroidManifest.xml.
 * Requires expo-pico-core to be listed first in the plugins array.
 */
const withPicoIap = (config) => {
    return (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        const manifest = config.modResults.manifest;
        if (!manifest['uses-permission'])
            manifest['uses-permission'] = [];
        const exists = manifest['uses-permission'].some((p) => p.$?.['android:name'] === PICO_BILLING_PERMISSION);
        if (!exists) {
            manifest['uses-permission'].push({
                $: { 'android:name': PICO_BILLING_PERMISSION },
            });
        }
        return config;
    });
};
exports.default = withPicoIap;
//# sourceMappingURL=withPicoIap.js.map