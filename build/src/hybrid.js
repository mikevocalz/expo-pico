"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePicoCore = resolvePicoCore;
exports.resolvePicoRuntime = resolvePicoRuntime;
exports.__resetPicoHybridCache = __resetPicoHybridCache;
const PicoCore_nitro_1 = require("./PicoCore.nitro");
const PicoRuntime_nitro_1 = require("./PicoRuntime.nitro");
// Nitro V1 removed NitroModules.createHybridObject, which
// @expo-pico/platform-service-common's resolveHybridObject still calls. Core
// constructs its own HybridObjects with V1 `new` and keeps that resolver's
// contract: one instance per runtime, or null when the native library is not
// registered (iOS, web, or a build without the Android library), so callers
// fall back to their native-absent defaults.
let core;
let runtime;
function resolvePicoCore() {
    if (core === undefined) {
        try {
            core = new PicoCore_nitro_1.PicoCore();
        }
        catch {
            core = null;
        }
    }
    return core;
}
function resolvePicoRuntime() {
    if (runtime === undefined) {
        try {
            runtime = new PicoRuntime_nitro_1.PicoRuntime();
        }
        catch {
            runtime = null;
        }
    }
    return runtime;
}
/** Test seam: drops the cached instances so a suite can re-resolve. */
function __resetPicoHybridCache() {
    core = undefined;
    runtime = undefined;
}
//# sourceMappingURL=hybrid.js.map