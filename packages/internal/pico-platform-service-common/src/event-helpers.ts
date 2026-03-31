// Lazy import of EventEmitter to avoid import-time failures in non-native environments
type EventEmitterType = import('expo-modules-core').EventEmitter;

/** Minimal subscription shape — compatible with both expo-modules-core v1 and v2. */
export interface Subscription {
  remove(): void;
}

type SubscriptionType = Subscription;

/**
 * Immutable null subscription returned when the event emitter is unavailable.
 * All listener functions must return this instead of crashing or returning undefined.
 */
export const NULL_SUBSCRIPTION: SubscriptionType = Object.freeze({
  remove: () => {},
} as SubscriptionType);

/**
 * Creates an EventEmitter bound to the native module, or returns null if the
 * module is unavailable.
 *
 * Use at the module level of every package — never instantiate EventEmitter inline.
 *
 * @example
 *   const emitter = createNativeEventEmitter(NativeRooms);
 */
export function createNativeEventEmitter(
  nativeModule: object | null
): EventEmitterType | null {
  if (!nativeModule) return null;
  try {
    // Dynamic require avoids static import errors in non-native test environments
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { EventEmitter } = require('expo-modules-core') as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      EventEmitter: new (module: any) => EventEmitterType;
    };
    return new EventEmitter(nativeModule);
  } catch {
    return null;
  }
}

/**
 * Safely registers an event listener. Returns NULL_SUBSCRIPTION when the
 * emitter is null (non-PICO build or SDK absent). Never crashes.
 */
export function safeAddListener<TEvent>(
  emitter: EventEmitterType | null,
  eventName: string,
  listener: (event: TEvent) => void
): SubscriptionType {
  if (!emitter) return NULL_SUBSCRIPTION;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (emitter as any).addListener(eventName, listener) as SubscriptionType;
}
