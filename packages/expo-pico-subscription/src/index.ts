import {
  guardService,
  wrapNativeCall,
} from '@expo-pico/platform-service-common';
import { NativeSubscription } from './ExpoPicoSubscriptionModule';
import type {
  SubscriptionProduct,
  ActiveSubscription,
  SubscriptionEntitlement,
  SubscribeOptions,
} from './types';

export * from './types';

const PKG = '@expo-pico/subscription';

// ─── Availability ─────────────────────────────────────────────────────────────

export function isSubscriptionAvailable(): boolean {
  return NativeSubscription?.subscriptionSdkAvailable ?? false;
}

export function getSubscriptionSdkVersion(): string {
  return NativeSubscription?.subscriptionSdkVersion ?? 'unavailable';
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function getSubscriptionProducts(skus: string[]): Promise<SubscriptionProduct[]> {
  guardService(isSubscriptionAvailable(), PKG, 'getSubscriptionProducts');
  const raw = await wrapNativeCall(
    PKG, 'getSubscriptionProducts',
    NativeSubscription!.getSubscriptionProducts(skus)
  );
  return raw as unknown as SubscriptionProduct[];
}

// ─── Active subscriptions ────────────────────────────────────────────────────

export async function getActiveSubscriptions(): Promise<ActiveSubscription[]> {
  guardService(isSubscriptionAvailable(), PKG, 'getActiveSubscriptions');
  const raw = await wrapNativeCall(
    PKG, 'getActiveSubscriptions',
    NativeSubscription!.getActiveSubscriptions()
  );
  return raw as unknown as ActiveSubscription[];
}

export async function getSubscriptionEntitlement(sku: string): Promise<SubscriptionEntitlement> {
  guardService(isSubscriptionAvailable(), PKG, 'getSubscriptionEntitlement');
  const raw = await wrapNativeCall(
    PKG, 'getSubscriptionEntitlement',
    NativeSubscription!.getSubscriptionEntitlement(sku)
  );
  return raw as unknown as SubscriptionEntitlement;
}

export async function subscribe(options: SubscribeOptions): Promise<void> {
  guardService(isSubscriptionAvailable(), PKG, 'subscribe');
  await wrapNativeCall(PKG, 'subscribe', NativeSubscription!.subscribe(options.sku));
}

// PPS 1.0.x has no programmatic cancel — native rejects REQUIRES_OS_UI.
export async function cancelSubscription(sku: string): Promise<void> {
  guardService(isSubscriptionAvailable(), PKG, 'cancelSubscription');
  await wrapNativeCall(PKG, 'cancelSubscription', NativeSubscription!.cancelSubscription(sku));
}
