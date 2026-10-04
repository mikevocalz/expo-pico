"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const withPicoStorage = (config, options) => {
    const { enabled = true } = options ?? {};
    if (!enabled)
        return config;
    config = (0, config_plugins_1.withAndroidManifest)(config, (cfg) => {
        const manifest = cfg.modResults.manifest;
        if (!manifest['uses-permission'])
            manifest['uses-permission'] = [];
        // INTERNET is already declared but ensure it's present
        const hasInternet = manifest['uses-permission'].some((p) => p.$?.['android:name'] === 'android.permission.INTERNET');
        if (!hasInternet) {
            manifest['uses-permission'].push({
                $: { 'android:name': 'android.permission.INTERNET' },
            });
        }
        return cfg;
    });
    return config;
};
exports.default = withPicoStorage;
//# sourceMappingURL=index.js.map