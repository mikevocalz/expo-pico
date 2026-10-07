"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PICO_BILLING_PERMISSION = void 0;
const plugin_1 = require("@expo-pico/core/plugin");
exports.PICO_BILLING_PERMISSION = 'com.picovr.payment.BILLING';
/**
 * Config plugin for expo-pico-iap.
 *
 * Declares the PICO billing permission. With a pico flavor (core
 * `buildVariant` `pico` or `dual`) it lands in the pico flavor manifest only,
 * so the quest and mobile APKs don't request it; with `buildVariant: 'mobile'`
 * it goes into the main manifest. Plugin order does not matter.
 */
const withPicoIap = (config) => (0, plugin_1.withPicoFlavorPermission)(config, exports.PICO_BILLING_PERMISSION);
exports.default = withPicoIap;
//# sourceMappingURL=withPicoIap.js.map