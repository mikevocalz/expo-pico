/** Minimal subscription shape returned by every listener API in the family. */
export interface Subscription {
    remove(): void;
}
/** Returned when the native surface is absent, so callers never get undefined. */
export declare const NULL_SUBSCRIPTION: Subscription;
//# sourceMappingURL=subscription.d.ts.map