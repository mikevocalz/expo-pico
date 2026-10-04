export type { IapProduct, IapProductType, IapPurchase, ConsumeResult, PurchaseResult, } from './types';
export declare function isIapAvailable(): boolean;
export declare function getIapSdkVersion(): string;
export declare function getProducts(skus: string[]): Promise<import("./types").IapProduct[]>;
export declare function consumePurchase(purchaseToken: string): Promise<import("./types").ConsumeResult>;
export declare function getPurchaseHistory(): Promise<import("./types").IapPurchase[]>;
export declare function isProductPurchased(sku: string): Promise<boolean>;
/** Seam — PICO requires the OS storefront UI; no headless purchase path exists. */
export declare function purchase(sku: string): Promise<import("./types").PurchaseResult>;
//# sourceMappingURL=index.d.ts.map