import type { SubscribeOptions } from './types';
export type { SubscriptionPeriod, EntitlementStatus, SubscriptionProduct, ActiveSubscription, SubscriptionEntitlement, SubscribeOptions, } from './types';
export declare function isSubscriptionAvailable(): boolean;
export declare function getSubscriptionSdkVersion(): string;
export declare function getSubscriptionProducts(skus: string[]): Promise<import("./types").SubscriptionProduct[]>;
export declare function getActiveSubscriptions(): Promise<import("./types").ActiveSubscription[]>;
export declare function getSubscriptionEntitlement(sku: string): Promise<import("./types").SubscriptionEntitlement>;
/** Seam — PICO requires the OS storefront UI. */
export declare function subscribe(options: SubscribeOptions): Promise<void>;
/** Rejects with `NOT_IN_PPS_1_0` — cancelling happens in the PICO Store. */
export declare function cancelSubscription(sku: string): Promise<void>;
//# sourceMappingURL=index.d.ts.map