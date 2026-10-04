"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveNativeModule = resolveNativeModule;
const expo_modules_core_1 = require("expo-modules-core");
/**
 * Resolve an Expo Modules v2 native module without making non-PICO/mobile
 * builds fail at import time.
 */
function resolveNativeModule(nativeModuleName) {
    const nativeModule = (0, expo_modules_core_1.requireOptionalNativeModule)(nativeModuleName);
    return nativeModule
        ? { available: true, nativeModule }
        : { available: false, nativeModule: null };
}
