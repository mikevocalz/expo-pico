import { requireNativeModule } from 'expo';

export type NativeModuleResolution<T extends object> =
  | { available: true; nativeModule: T }
  | { available: false; nativeModule: null };

/**
 * Resolves a native nativeModule by name without throwing.
 * Returns `{ available: false, nativeModule: null }` on any build where the native
 * nativeModule is not registered (non-PICO build, SDK AAR not linked, etc.).
 *
 * Every ExpoPico*Module.ts file must use this instead of requireNativeModule directly.
 */
export function resolveNativeModule<T extends object>(
  nativeModuleName: string
): NativeModuleResolution<T> {
  try {
    return { available: true, nativeModule: requireNativeModule<T>(nativeModuleName) };
  } catch {
    return { available: false, nativeModule: null };
  }
}
