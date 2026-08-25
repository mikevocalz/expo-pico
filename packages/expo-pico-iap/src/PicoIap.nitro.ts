import type { HybridObject } from 'react-native-nitro-modules';

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

export interface ConsumeResult {
  sku: string;
  purchaseToken: string;
  consumedAtMs: number;
}

/** purchase() is a permanent seam — PICO requires OS storefront UI. */
export interface PurchaseResult {
  sku: string;
  orderId: string;
  purchaseToken: string;
  purchasedAtMs: number;
}

export interface PicoIap extends HybridObject<{ android: 'kotlin' }> {
  readonly available: boolean;
  readonly sdkVersion: string;

  getProducts(skus: string[]): Promise<IapProduct[]>;
  consumePurchase(purchaseToken: string): Promise<ConsumeResult>;
  getPurchaseHistory(): Promise<IapPurchase[]>;
  purchase(sku: string): Promise<PurchaseResult>;
}
