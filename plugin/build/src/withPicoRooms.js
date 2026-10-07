"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PICO_SOCIAL_PERMISSION = void 0;
const plugin_1 = require("@expo-pico/core/plugin");
exports.PICO_SOCIAL_PERMISSION = 'com.picovr.platform.permission.SOCIAL';
/**
 * Config plugin for expo-pico-rooms.
 *
 * Declares the PICO social/platform permission needed for room and
 * matchmaking APIs, routed by core to the pico flavor manifest when one
 * exists (main manifest otherwise). Does NOT inject flavors or Maven repos —
 * core owns those.
 *
 * No config options needed — the permission is always required when using rooms.
 */
const withPicoRooms = (config) => (0, plugin_1.withPicoFlavorPermission)(config, exports.PICO_SOCIAL_PERMISSION);
exports.default = withPicoRooms;
//# sourceMappingURL=withPicoRooms.js.map