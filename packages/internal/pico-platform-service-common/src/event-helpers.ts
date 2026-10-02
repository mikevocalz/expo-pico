/**
 * Minimal subscription shape returned by every listener API in the family.
 */
export interface Subscription {
  remove(): void;
}

/** Returned when the native surface is absent, so callers never get undefined. */
export const NULL_SUBSCRIPTION: Subscription = Object.freeze({
  remove: () => {},
});

export interface NativeEventSource {
  addListener?: (eventName: string, listener: (...args: any[]) => void) => Subscription | void;
}

/**
 * Expo Modules v2 native modules already implement the event-emitter surface.
 * Keep this helper dependency-free so Jest/node builds do not need to evaluate
 * expo-modules-core's ESM runtime.
 */
export function createNativeEventEmitter<T extends NativeEventSource | null | undefined>(
  nativeModule: T
): T {
  return nativeModule;
}

/** Adds a listener when the native module exposes one, otherwise returns a no-op subscription. */
export function safeAddListener(
  emitter: NativeEventSource | null | undefined,
  eventName: string,
  listener: (...args: any[]) => void
): Subscription {
  try {
    const subscription = emitter?.addListener?.(eventName, listener);
    return subscription && typeof subscription.remove === 'function'
      ? subscription
      : NULL_SUBSCRIPTION;
  } catch {
    return NULL_SUBSCRIPTION;
  }
}
