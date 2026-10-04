"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const SOCIAL_PERMISSION = 'com.picovr.platform.permission.SOCIAL';
const withPicoSocial = (config, options) => {
    const { enabled = true } = options ?? {};
    if (!enabled)
        return config;
    config = (0, config_plugins_1.withAndroidManifest)(config, (cfg) => {
        const manifest = cfg.modResults.manifest;
        if (!manifest['uses-permission'])
            manifest['uses-permission'] = [];
        const exists = manifest['uses-permission'].some((p) => p.$?.['android:name'] === SOCIAL_PERMISSION);
        if (!exists) {
            manifest['uses-permission'].push({ $: { 'android:name': SOCIAL_PERMISSION } });
        }
        return cfg;
    });
    return config;
};
exports.default = withPicoSocial;
//# sourceMappingURL=index.js.map