import { NitroModules } from 'react-native-nitro-modules';

const EXPO_MODULES: Record<string, { name: string; prefix: string }> = {
  PicoAccount: { name: 'ExpoPicoAccount', prefix: 'account' },
  PicoAchievements: { name: 'ExpoPicoAchievements', prefix: 'achievements' },
  PicoIap: { name: 'ExpoPicoIap', prefix: 'iap' },
  PicoLeaderboards: { name: 'ExpoPicoLeaderboards', prefix: 'leaderboards' },
  PicoNotifications: { name: 'ExpoPicoNotifications', prefix: 'notifications' },
  PicoRooms: { name: 'ExpoPicoRooms', prefix: 'rooms' },
  PicoSocial: { name: 'ExpoPicoSocial', prefix: 'social' },
  PicoStorage: { name: 'ExpoPicoStorage', prefix: 'storage' },
  PicoSubscription: { name: 'ExpoPicoSubscription', prefix: 'subscription' },
};

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

function bindIfFunction(target: object, value: unknown): unknown {
  return typeof value === 'function' ? value.bind(target) : value;
}

/**
 * Transitional package resolver.
 *
 * Expo Modules v2 is primary. During the stacked migration, Nitro is only a
 * per-property fallback for PPS methods that were added after the original
 * Expo Module implementations. That means already-restored calls stop paying
 * the HybridObject/JNI/codegen cost immediately without regressing newer APIs.
 */
export function resolveHybridObject<T extends object>(name: string): T | null {
  if (cache.has(name)) return cache.get(name) as T | null;

  const mapping = EXPO_MODULES[name];
  let expoModule: Record<string, unknown> | null = null;
  let nitroModule: Record<string, unknown> | null = null;

  if (mapping) {
    expoModule = loadOptionalExpoModule<Record<string, unknown>>(mapping.name);
  } else {
    expoModule = loadOptionalExpoModule<Record<string, unknown>>(name);
  }

  try {
    nitroModule = NitroModules.createHybridObject(name) as Record<string, unknown>;
  } catch {
    nitroModule = null;
  }

  if (!expoModule && !nitroModule) {
    cache.set(name, null);
    return null;
  }

  if (!expoModule) {
    cache.set(name, nitroModule);
    return nitroModule as T;
  }

  if (!nitroModule) {
    cache.set(name, expoModule);
    return expoModule as T;
  }

  const prefix = mapping?.prefix;
  const merged = new Proxy(expoModule, {
    get(target, prop, receiver) {
      if (typeof prop === 'string') {
        if (prop in target && target[prop] !== undefined) {
          return bindIfFunction(target, target[prop]);
        }
        if (prefix) {
          const alias =
            prop === 'available'
              ? `${prefix}SdkAvailable`
              : prop === 'sdkVersion'
                ? `${prefix}SdkVersion`
                : prop === 'sdkStatus'
                  ? `${prefix}SdkStatus`
                  : null;
          if (alias && alias in target && target[alias] !== undefined) {
            return bindIfFunction(target, target[alias]);
          }
        }
        if (prop in nitroModule! && nitroModule![prop] !== undefined) {
          return bindIfFunction(nitroModule!, nitroModule![prop]);
        }
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as T;

  cache.set(name, merged);
  return merged;
}

export function __resetHybridCache(): void {
  cache.clear();
}
