import { NativeModule } from 'expo';
import { resolveNativeModule } from '@expo-pico/platform-service-common';

declare class ExpoPicoAccountModule extends NativeModule {
  readonly accountSdkAvailable: boolean;
  readonly accountSdkVersion: string;

  getUserProfile(): Promise<Record<string, unknown>>;
  getAccountLinkStatus(): Promise<string>;
  getAccessToken(): Promise<string>;
  login(): Promise<Record<string, unknown>>;
  logout(): Promise<void>;
}

const { available, nativeModule } = resolveNativeModule<ExpoPicoAccountModule>('ExpoPicoAccount');

export const NativeAccount = available ? nativeModule : null;
export const accountNativeAvailable = available;
