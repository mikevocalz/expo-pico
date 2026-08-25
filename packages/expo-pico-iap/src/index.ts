import {
  guardService,
  wrapNativeCall,
  resolveHybridObject,
} from '@expo-pico/platform-service-common';
import type { PicoIap } from './PicoIap.nitro';

export type {
  IapProduct,
  IapProductType,
  IapPurchase,
  ConsumeResult,
  PurchaseResult,
} from './PicoIap.nitro';

const PKG = '@expo-pico/iap';

function native(): PicoIap | null {
  return resolveHybridObject<PicoIap>('PicoIap');
}

export function isIapAvailable(): boolean {
  return native()?.available ?? false;
}

export function getIapSdkVersion(): string {
  return native()?.sdkVersion ?? 'unavailable';
}

export async function getProducts(skus: string[]) {
  guardService(isIapAvailable(), PKG, 'getProducts');
  return wrapNativeCall(PKG, 'getProducts', native()!.getProducts(skus));
}

export async function consumePurchase(purchaseToken: string) {
  guardService(isIapAvailable(), PKG, 'consumePurchase');
  return wrapNativeCall(PKG, 'consumePurchase', native()!.consumePurchase(purchaseToken));
}

export async function getPurchaseHistory() {
  guardService(isIapAvailable(), PKG, 'getPurchaseHistory');
  return wrapNativeCall(PKG, 'getPurchaseHistory', native()!.getPurchaseHistory());
}

/** Seam — PICO requires the OS storefront UI; no headless purchase path exists. */
export async function purchase(sku: string) {
  guardService(isIapAvailable(), PKG, 'purchase');
  return wrapNativeCall(PKG, 'purchase', native()!.purchase(sku));
}
