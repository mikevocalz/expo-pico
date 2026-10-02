import { NitroModules } from 'react-native-nitro-modules';

/**
 * Transitional resolver while expo-pico moves package-by-package from Nitro
 * to Expo Modules v2.
 *
 * Expo Modules v2 is always preferred. Nitro is compatibility-only until the
 * final migration PR removes it entirely. Both paths are optional so mobile
 * and non-PICO builds degrade to SERVICE_UNAVAILABLE rather than crashing at
 * module evaluation time.
 */
const cache = new Map<string, unknown>();

function loadOptionalExpoModule<T extends object>(name: string): T | null {
  try {
    // Keep expo-modules-core out of module evaluation in Node/Jest. Its SDK 58
    // entry is ESM, while these package tests compile to CommonJS.
    const core = require('expo-modules-core') as typeof import('expo-modules-core');
    return core.requireOptionalNativeModule<T>(name);
  } catch {
    return null;
  }
}

export function resolveHybridObject<T extends object>(name: string): T | null {
  if (cache.has(name)) return cache.get(name) as T | null;

  let resolved: T | null = null;
  resolved = loadOptionalExpoModule<T>(name);

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
