"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PICO_BILLING_PERMISSION = void 0;
const plugin_1 = require("@expo-pico/core/plugin");
exports.PICO_BILLING_PERMISSION = 'com.picovr.payment.BILLING';
/**
 * Config plugin for expo-pico-subscription.
 *
 * Declares the PICO billing permission through core's flavor routing (pico
 * flavor manifest when one exists, main manifest otherwise). Safe to use
 * alongside expo-pico-iap: both record the same permission and it is
 * written once.
 *
 * Does NOT inject flavors or Maven repos — core owns those.
 */
const withPicoSubscription = (config) => (0, plugin_1.withPicoFlavorPermission)(config, exports.PICO_BILLING_PERMISSION);
exports.default = withPicoSubscription;
//# sourceMappingURL=withPicoSubscription.js.map