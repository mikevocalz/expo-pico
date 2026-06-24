import {
  guardService,
  wrapNativeCall,
} from '@expo-pico/platform-service-common';
import { NativeIap } from './ExpoPicoIapModule';
import type { IapProduct, IapPurchase, PurchaseResult, ConsumeResult } from './types';

export * from './types';

const PKG = '@expo-pico/iap';

// ─── Availability ─────────────────────────────────────────────────────────────

export function isIapAvailable(): boolean {
  return NativeIap?.iapSdkAvailable ?? false;
}

export function getIapSdkVersion(): string {
  return NativeIap?.iapSdkVersion ?? 'unavailable';
}

// ─── Implemented ──────────────────────────────────────────────────────────────

export async function getProducts(skus: string[]): Promise<IapProduct[]> {
  guardService(isIapAvailable(), PKG, 'getProducts');
  const raw = await wrapNativeCall(PKG, 'getProducts', NativeIap!.getProducts(skus));
  return raw as unknown as IapProduct[];
}

export async function consumePurchase(purchaseToken: string): Promise<ConsumeResult> {
  guardService(isIapAvailable(), PKG, 'consumePurchase');
  const raw = await wrapNativeCall(PKG, 'consumePurchase', NativeIap!.consumePurchase(purchaseToken));
  return raw as unknown as ConsumeResult;
}

export async function getPurchaseHistory(): Promise<IapPurchase[]> {
  guardService(isIapAvailable(), PKG, 'getPurchaseHistory');
  const raw = await wrapNativeCall(PKG, 'getPurchaseHistory', NativeIap!.getPurchaseHistory());
  return raw as unknown as IapPurchase[];
}

export async function purchase(sku: string): Promise<PurchaseResult> {
  guardService(isIapAvailable(), PKG, 'purchase');
  const raw = await wrapNativeCall(PKG, 'purchase', NativeIap!.purchase(sku));
  return raw as unknown as PurchaseResult;
}
