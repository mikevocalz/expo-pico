import type { HybridObject } from 'react-native-nitro-modules';

export type SubscriptionPeriod = 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

export type EntitlementStatus =
  | 'active'
  | 'in-grace'
  | 'paused'
  | 'cancelled'
  | 'expired'
  | 'not-subscribed';

export interface SubscriptionProduct {
  sku: string;
  title: string;
  description: string;
  formattedPrice: string;
  priceMicros: number;
  currency: string;
  period: SubscriptionPeriod;
  trialDays: number;
  introductoryFormattedPrice?: string;
}

export interface ActiveSubscription {
  sku: string;
  orderId: string;
  purchaseToken: string;
  currentPeriodStartMs: number;
  currentPeriodEndMs: number;
  autoRenewing: boolean;
  status: EntitlementStatus;
}

export interface SubscriptionEntitlement {
  sku: string;
  status: EntitlementStatus;
  currentSubscription?: ActiveSubscription;
  expiresAtMs?: number;
}

export interface SubscribeOptions {
  sku: string;
  promoCode?: string;
}

export interface PicoSubscription extends HybridObject<{ android: 'kotlin' }> {
  readonly available: boolean;
  readonly sdkVersion: string;

  getSubscriptionProducts(skus: string[]): Promise<SubscriptionProduct[]>;
  getActiveSubscriptions(): Promise<ActiveSubscription[]>;
  getSubscriptionEntitlement(sku: string): Promise<SubscriptionEntitlement>;
  /** Seam — PICO requires OS storefront UI. */
  subscribe(options: SubscribeOptions): Promise<void>;
  /** Returns REQUIRES_OS_UI; cancellation happens in the PICO settings app. */
  cancelSubscription(sku: string): Promise<void>;
}
