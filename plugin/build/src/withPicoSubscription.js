"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const PICO_BILLING_PERMISSION = 'com.picovr.payment.BILLING';
/**
 * Config plugin for expo-pico-subscription.
 *
 * Adds the PICO billing permission. Idempotent — safe to use alongside
 * expo-pico-iap (both declare the same permission; Android manifest merger
 * deduplicates automatically, and the guard check prevents double-push
 * into the config plugin output array).
 *
 * Does NOT inject flavors or Maven repos — core owns those.
 */
const withPicoSubscription = (config) => {
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
exports.default = withPicoSubscription;
//# sourceMappingURL=withPicoSubscription.js.map