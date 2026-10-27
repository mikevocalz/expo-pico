export type { IapProduct, IapProductType, IapPurchase, ConsumeResult, PurchaseResult, } from './types';
export declare function isIapAvailable(): boolean;
export declare function getIapSdkVersion(): string;
export declare function getProducts(skus: string[]): Promise<import("./PicoIap.nitro").IapProduct[]>;
export declare function consumePurchase(purchaseToken: string): Promise<import("./PicoIap.nitro").ConsumeResult>;
export declare function getPurchaseHistory(): Promise<import("./PicoIap.nitro").IapPurchase[]>;
export declare function isProductPurchased(sku: string): Promise<boolean>;
/** Seam — PICO requires the OS storefront UI; no headless purchase path exists. */
export declare function purchase(sku: string): Promise<import("./PicoIap.nitro").PurchaseResult>;
//# sourceMappingURL=index.d.ts.map