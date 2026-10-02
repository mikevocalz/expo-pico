import { requireOptionalNativeModule } from 'expo-modules-core';

export type NativeModuleResolution<T extends object> =
  | { available: true; nativeModule: T }
  | { available: false; nativeModule: null };

/**
 * Resolve an Expo Modules v2 native module without making non-PICO/mobile
 * builds fail at import time.
 */
export function resolveNativeModule<T extends object>(
  nativeModuleName: string
): NativeModuleResolution<T> {
  const nativeModule = requireOptionalNativeModule<T>(nativeModuleName);
  return nativeModule
    ? { available: true, nativeModule }
    : { available: false, nativeModule: null };
}
