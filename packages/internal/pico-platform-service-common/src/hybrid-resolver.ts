import { requireOptionalNativeModule } from 'expo-modules-core';
import { NitroModules } from 'react-native-nitro-modules';

/**
 * Transitional resolver used while expo-pico moves from Nitro to Expo Modules v2.
 *
 * Resolution order is intentional:
 *   1. Expo Modules v2 — the target architecture.
 *   2. Nitro HybridObject — compatibility fallback until that package migrates.
 *
 * Both paths are optional so mobile/non-PICO builds degrade to
 * SERVICE_UNAVAILABLE instead of crashing at module evaluation time.
 */
const cache = new Map<string, unknown>();

export function resolveHybridObject<T extends object>(name: string): T | null {
  if (cache.has(name)) return cache.get(name) as T | null;

  let resolved: T | null = null;

  try {
    resolved = requireOptionalNativeModule<T>(name);
  } catch {
    resolved = null;
  }

  if (!resolved) {
    try {
      resolved = NitroModules.createHybridObject(name) as T;
    } catch {
      resolved = null;
    }
  }

  cache.set(name, resolved);
  return resolved;
}

/** Test seam — drops the cache so a suite can re-resolve. */
export function __resetHybridCache(): void {
  cache.clear();
}
