/**
 * Minimal subscription shape returned by every listener API in the family.
 * Nitro listeners are id-based, so each package wraps its id in one of these.
 */
export interface Subscription {
    remove(): void;
}
/** Returned when the native surface is absent, so callers never get undefined. */
export declare const NULL_SUBSCRIPTION: Subscription;
//# sourceMappingURL=event-helpers.d.ts.map