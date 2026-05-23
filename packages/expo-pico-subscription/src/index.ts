import {
  guardService,
  wrapNativeCall,
  notImplementedError,
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
const DOCS = 'https://developer.picoxr.com/document/unity/subscription/';

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

// ─── Purchase / cancel (permanent seams) ─────────────────────────────────────

/**
 * @seam Permanent — requires OS storefront UI. No headless purchase path
 * documented in public PICO SDK. Wire when PICO adds headless subscription API.
 */
export async function subscribe(_options: SubscribeOptions): Promise<void> {
  throw notImplementedError(PKG, 'subscribe', DOCS);
}

/**
 * @seam Permanent — cancellation redirects to OS subscription management screen.
 * No programmatic cancellation path documented.
 */
export async function cancelSubscription(_sku: string): Promise<void> {
  throw notImplementedError(PKG, 'cancelSubscription', DOCS);
}
