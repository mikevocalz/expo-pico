"use strict";
// Same shape and value as @expo-pico/platform-service-common's exports. Core
// keeps its own copy because the published 1.0.0 tarball never declared that
// package as a dependency, and its resolveHybridObject calls
// NitroModules.createHybridObject, which Nitro V1 removed.
Object.defineProperty(exports, "__esModule", { value: true });
exports.NULL_SUBSCRIPTION = void 0;
/** Returned when the native surface is absent, so callers never get undefined. */
exports.NULL_SUBSCRIPTION = Object.freeze({
    remove: () => { },
});
//# sourceMappingURL=subscription.js.map