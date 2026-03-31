import { NativeModule } from 'expo';
import { resolveNativeModule } from '@expo-pico/platform-service-common';

declare class ExpoPicoIapModule extends NativeModule {
  readonly iapSdkAvailable: boolean;
  readonly iapSdkVersion: string;

  getProducts(skus: string[]): Promise<Record<string, unknown>[]>;
  consumePurchase(purchaseToken: string): Promise<Record<string, unknown>>;
  getPurchaseHistory(): Promise<Record<string, unknown>[]>;
}

const { available, nativeModule } = resolveNativeModule<ExpoPicoIapModule>('ExpoPicoIap');

export const NativeIap = available ? nativeModule : null;
export const iapNativeAvailable = available;
