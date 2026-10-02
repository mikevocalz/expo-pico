export type NativeModuleResolution<T extends object> =
  | { available: true; nativeModule: T }
  | { available: false; nativeModule: null };

function loadOptionalNativeModule<T extends object>(name: string): T | null {
  try {
    const core = require('expo-modules-core') as typeof import('expo-modules-core');
    return core.requireOptionalNativeModule<T>(name);
  } catch {
    return null;
  }
}

/**
 * Resolve an Expo Modules v2 native module without making non-PICO/mobile
 * builds or CommonJS Jest tests fail at import time.
 */
export function resolveNativeModule<T extends object>(
  nativeModuleName: string
): NativeModuleResolution<T> {
  const nativeModule = loadOptionalNativeModule<T>(nativeModuleName);
  return nativeModule
    ? { available: true, nativeModule }
    : { available: false, nativeModule: null };
}
