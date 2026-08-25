import {
  guardService,
  wrapNativeCall,
  resolveHybridObject,
} from '@expo-pico/platform-service-common';
import type { PicoSubscription, SubscribeOptions } from './PicoSubscription.nitro';

export type {
  SubscriptionPeriod,
  EntitlementStatus,
  SubscriptionProduct,
  ActiveSubscription,
  SubscriptionEntitlement,
  SubscribeOptions,
} from './PicoSubscription.nitro';

const PKG = '@expo-pico/subscription';

function native(): PicoSubscription | null {
  return resolveHybridObject<PicoSubscription>('PicoSubscription');
}

export function isSubscriptionAvailable(): boolean {
  return native()?.available ?? false;
}

export function getSubscriptionSdkVersion(): string {
  return native()?.sdkVersion ?? 'unavailable';
}

export async function getSubscriptionProducts(skus: string[]) {
  guardService(isSubscriptionAvailable(), PKG, 'getSubscriptionProducts');
  return wrapNativeCall(PKG, 'getSubscriptionProducts', native()!.getSubscriptionProducts(skus));
}

export async function getActiveSubscriptions() {
  guardService(isSubscriptionAvailable(), PKG, 'getActiveSubscriptions');
  return wrapNativeCall(PKG, 'getActiveSubscriptions', native()!.getActiveSubscriptions());
}

export async function getSubscriptionEntitlement(sku: string) {
  guardService(isSubscriptionAvailable(), PKG, 'getSubscriptionEntitlement');
  return wrapNativeCall(
    PKG,
    'getSubscriptionEntitlement',
    native()!.getSubscriptionEntitlement(sku)
  );
}

/** Seam — PICO requires the OS storefront UI. */
export async function subscribe(options: SubscribeOptions): Promise<void> {
  guardService(isSubscriptionAvailable(), PKG, 'subscribe');
  await wrapNativeCall(PKG, 'subscribe', native()!.subscribe(options));
}

/** Rejects with `NOT_IN_PPS_1_0` — cancelling happens in the PICO Store. */
export async function cancelSubscription(sku: string): Promise<void> {
  guardService(isSubscriptionAvailable(), PKG, 'cancelSubscription');
  await wrapNativeCall(PKG, 'cancelSubscription', native()!.cancelSubscription(sku));
}
