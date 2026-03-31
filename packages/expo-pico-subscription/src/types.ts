import type { PicoErrorCode } from '@expo-pico/platform-service-common';

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
  /** Formatted price string, e.g. "$4.99" */
  formattedPrice: string;
  /** Price in micro-units, e.g. 4990000 for $4.99 */
  priceMicros: number;
  currency: string;
  period: SubscriptionPeriod;
  trialDays: number;
  introductoryFormattedPrice: string | null;
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
  currentSubscription: ActiveSubscription | null;
  expiresAtMs: number | null;
}

/**
 * subscribe() is a permanent seam.
 * PICO subscription purchase requires OS-level storefront UI.
 * No headless purchase path is documented in public PICO SDK docs.
 */
export interface SubscribeOptions {
  sku: string;
  promoCode?: string;
}
