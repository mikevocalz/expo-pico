"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCIAL_PERMISSION = void 0;
const plugin_1 = require("@expo-pico/core/plugin");
exports.SOCIAL_PERMISSION = 'com.picovr.platform.permission.SOCIAL';
/**
 * Declares the PICO social permission, routed by core to the pico flavor
 * manifest when one exists (main manifest otherwise).
 */
const withPicoSocial = (config, options) => {
    const { enabled = true } = options ?? {};
    if (!enabled)
        return config;
    return (0, plugin_1.withPicoFlavorPermission)(config, exports.SOCIAL_PERMISSION);
};
exports.default = withPicoSocial;
//# sourceMappingURL=index.js.map