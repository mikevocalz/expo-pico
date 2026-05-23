// PPS service barrel. Re-exports the seven platform-service modules so
// app code can do `import { account, iap, social, ... } from '@/pico'`
// without remembering each individual package name.
//
// Metro doesn't allow dynamic require() with a variable argument, so
// each loader is its own static try/require — clunkier than a Proxy but
// the only shape Metro will accept.

import { getPicoCapabilities, type PicoCapabilities } from './picoCapabilities';

function loadModule(loader: () => any): any | null {
  try {
    const m = loader();
    return m ?? null;
  } catch {
    return null;
  }
}

function makeWrapper<T extends keyof PicoCapabilities>(
  loader: () => any,
  capability: T,
  label: string,
): any {
  return new Proxy({} as any, {
    get(_target, prop) {
      if (!getPicoCapabilities()[capability]) {
        return () =>
          Promise.reject(
            new Error(`[pico/${label}] bridge unavailable — required PICO SDK class not on classpath`),
          );
      }
      const mod = loadModule(loader);
      if (!mod) {
        return () =>
          Promise.reject(new Error(`[pico/${label}] module failed to load`));
      }
      const value = (mod as any)[prop as string];
      return typeof value === 'function' ? value.bind(mod) : value;
    },
  });
}

export const account = makeWrapper(() => require('@expo-pico/account'), 'account', 'account');
export const iap = makeWrapper(() => require('@expo-pico/iap'), 'iap', 'iap');
export const achievement = makeWrapper(() => require('@expo-pico/achievements'), 'achievement', 'achievement');
export const leaderboard = makeWrapper(() => require('@expo-pico/leaderboards'), 'leaderboard', 'leaderboard');
export const friend = makeWrapper(() => require('@expo-pico/rooms'), 'friend', 'friend');
export const push = makeWrapper(() => require('@expo-pico/notifications'), 'push', 'push');
export const social = makeWrapper(() => require('@expo-pico/social'), 'social', 'social');
export const rtc = makeWrapper(() => require('@expo-pico/rtc'), 'rtc', 'rtc');
export const storage = makeWrapper(() => require('@expo-pico/storage'), 'storage', 'storage');
export const subscription = makeWrapper(() => require('@expo-pico/subscription'), 'subscription', 'subscription');
