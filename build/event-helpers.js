"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NULL_SUBSCRIPTION = void 0;
exports.createNativeEventEmitter = createNativeEventEmitter;
exports.safeAddListener = safeAddListener;
/** Returned when the native surface is absent, so callers never get undefined. */
exports.NULL_SUBSCRIPTION = Object.freeze({
    remove: () => { },
});
/**
 * Expo Modules v2 native modules already implement the event-emitter surface.
 * Keep this helper dependency-free so Jest/node builds do not need to evaluate
 * expo-modules-core's ESM runtime.
 */
function createNativeEventEmitter(nativeModule) {
    return nativeModule;
}
/** Adds a listener when the native module exposes one, otherwise returns a no-op subscription. */
function safeAddListener(emitter, eventName, listener) {
    try {
        const subscription = emitter?.addListener?.(eventName, listener);
        return subscription && typeof subscription.remove === 'function'
            ? subscription
            : exports.NULL_SUBSCRIPTION;
    }
    catch {
        return exports.NULL_SUBSCRIPTION;
    }
}
