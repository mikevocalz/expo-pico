import { NitroModules, type HybridObject } from 'react-native-nitro-modules';

/**
 * Resolves an autolinked HybridObject, or null when the native library is not
 * in this build (mobile flavor, non-PICO hardware, Gradle offline at prebuild).
 *
 * createHybridObject throws in those cases; every expo-pico package must
 * degrade to SERVICE_UNAVAILABLE instead of failing at module load, so the
 * throw is swallowed here and the result cached either way.
 */
const cache = new Map<string, unknown>();

export function resolveHybridObject<T extends HybridObject<{}>>(name: string): T | null {
  if (cache.has(name)) return cache.get(name) as T | null;
  let resolved: T | null;
  try {
    resolved = NitroModules.createHybridObject<T>(name);
  } catch {
    resolved = null;
  }
  cache.set(name, resolved);
  return resolved;
}

/** Test seam — drops the cache so a suite can re-resolve. */
export function __resetHybridCache(): void {
  cache.clear();
}
