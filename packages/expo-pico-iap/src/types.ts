export type IapProductType = 'consumable' | 'non-consumable';

export interface IapProduct {
  sku: string;
  title: string;
  description: string;
  formattedPrice: string;
  priceMicros: number;
  currency: string;
  type: IapProductType;
}

export interface IapPurchase {
  sku: string;
  orderId: string;
  purchaseToken: string;
  purchasedAtMs: number;
  isConsumed: boolean;
}

/** Result of a successful consumePurchase() call */
export interface ConsumeResult {
  sku: string;
  purchaseToken: string;
  consumedAtMs: number;
}

/**
 * purchase() is a permanent seam.
 * PICO IAP purchase requires OS storefront UI — no headless path is documented.
 * This type exists so callers can type the (deferred) return value correctly.
 */
export interface PurchaseResult {
  sku: string;
  orderId: string;
  purchaseToken: string;
  purchasedAtMs: number;
}
