// Same shape and value as @expo-pico/platform-service-common's exports. Core
// keeps its own copy because the published 1.0.0 tarball never declared that
// package as a dependency, and its resolveHybridObject calls
// NitroModules.createHybridObject, which Nitro V1 removed.

/** Minimal subscription shape returned by every listener API in the family. */
export interface Subscription {
  remove(): void;
}

/** Returned when the native surface is absent, so callers never get undefined. */
export const NULL_SUBSCRIPTION: Subscription = Object.freeze({
  remove: () => {},
});
