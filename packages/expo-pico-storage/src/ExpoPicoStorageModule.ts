import { NativeModule } from 'expo';
import { resolveNativeModule } from '@expo-pico/platform-service-common';

declare class ExpoPicoStorageModule extends NativeModule {
  readonly storageSdkAvailable: boolean;
  readonly storageSdkVersion: string;

  saveEntry(key: string, value: string, conflictPolicy: string, maxBytes: number): Promise<Record<string, unknown>>;
  loadEntry(key: string): Promise<Record<string, unknown>>;
  deleteEntry(key: string): Promise<void>;
  listKeys(): Promise<string[]>;
  syncStorage(): Promise<Record<string, unknown>>;
  getStorageQuota(): Promise<Record<string, unknown>>;
  clearLocalCache(): Promise<void>;
}

const { available, nativeModule } = resolveNativeModule<ExpoPicoStorageModule>('ExpoPicoStorage');

export const NativeStorage = available ? nativeModule : null;
export const storageNativeAvailable = available;
export default NativeStorage;
