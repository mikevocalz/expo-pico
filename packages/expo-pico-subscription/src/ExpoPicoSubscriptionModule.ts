import { NativeModule } from 'expo';
import { resolveNativeModule } from '@expo-pico/platform-service-common';

declare class ExpoPicoSubscriptionModule extends NativeModule {
  readonly subscriptionSdkAvailable: boolean;
  readonly subscriptionSdkVersion: string;

  getSubscriptionProducts(skus: string[]): Promise<Record<string, unknown>[]>;
  getActiveSubscriptions(): Promise<Record<string, unknown>[]>;
  getSubscriptionEntitlement(sku: string): Promise<Record<string, unknown>>;
  subscribe(sku: string): Promise<Record<string, unknown>>;
  cancelSubscription(sku: string): Promise<void>;
}

const { available, nativeModule } = resolveNativeModule<ExpoPicoSubscriptionModule>('ExpoPicoSubscription');

export const NativeSubscription = available ? nativeModule : null;
export const subscriptionNativeAvailable = available;
