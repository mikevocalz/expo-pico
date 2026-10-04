/**
 * Minimal subscription shape returned by every listener API in the family.
 */
export interface Subscription {
    remove(): void;
}
/** Returned when the native surface is absent, so callers never get undefined. */
export declare const NULL_SUBSCRIPTION: Subscription;
export interface NativeEventSource {
    addListener?: (eventName: string, listener: (...args: any[]) => void) => Subscription | void;
}
/**
 * Expo Modules v2 native modules already implement the event-emitter surface.
 * Keep this helper dependency-free so Jest/node builds do not need to evaluate
 * expo-modules-core's ESM runtime.
 */
export declare function createNativeEventEmitter<T extends NativeEventSource | null | undefined>(nativeModule: T): T;
/** Adds a listener when the native module exposes one, otherwise returns a no-op subscription. */
export declare function safeAddListener(emitter: NativeEventSource | null | undefined, eventName: string, listener: (...args: any[]) => void): Subscription;
//# sourceMappingURL=event-helpers.d.ts.map