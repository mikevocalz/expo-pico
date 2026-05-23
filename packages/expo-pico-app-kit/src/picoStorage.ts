// Two-tier hybrid storage:
//
//   - react-native-mmkv: fast local mmap-backed key/value store. Synchronous
//     reads/writes, single device. Used as the hot cache and the source of
//     truth for the UI.
//   - @expo-pico/storage: Pico cloud storage, user-account-scoped, syncs
//     across devices, has quota + conflict resolution. Used as the durable
//     backing store.
//
// Writes go to mmkv immediately (sync) and schedule a debounced cloud
// flush. Reads return the mmkv value synchronously when present; otherwise
// async-fetch from cloud and populate mmkv on resolve.
//
// On boot, call `hydrateFromCloud()` to pull cloud entries into mmkv so the
// next read is a sync cache hit. On exit / background, call `syncToCloud()`
// to flush any pending writes.

import { useEffect, useState } from 'react';

import { createMMKV } from 'react-native-mmkv';

import { getPicoCapabilities } from './picoCapabilities';

// react-native-mmkv 4.x removed the `new MMKV(...)` constructor in favour
// of a factory. The returned object exposes set/get*/contains/remove/
// getAllKeys/clearAll/addOnValueChangedListener — same shape as before
// except `delete` is now `remove`.
const mmkv = createMMKV({ id: 'pico-hybrid-storage' });

// Keys touched since the last cloud flush. Cleared after a successful
// syncToCloud(). On reload from background we drain this set.
const dirtyKeys = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const DEFAULT_FLUSH_DEBOUNCE_MS = 1500;

function scheduleCloudFlush(debounceMs: number = DEFAULT_FLUSH_DEBOUNCE_MS) {
  if (!getPicoCapabilities().storage) return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    syncToCloud().catch(() => {
      // Swallow — the dirty set still has the key; we'll retry on next write
      // or explicit syncToCloud() call.
    });
  }, debounceMs);
}

// ───────── Public sync API (mmkv-backed) ─────────

export function getString(key: string): string | undefined {
  return mmkv.getString(key);
}

export function setString(key: string, value: string): void {
  mmkv.set(key, value);
  dirtyKeys.add(key);
  scheduleCloudFlush();
}

export function getNumber(key: string): number | undefined {
  return mmkv.getNumber(key);
}

export function setNumber(key: string, value: number): void {
  mmkv.set(key, value);
  dirtyKeys.add(key);
  scheduleCloudFlush();
}

export function getBoolean(key: string): boolean | undefined {
  return mmkv.getBoolean(key);
}

export function setBoolean(key: string, value: boolean): void {
  mmkv.set(key, value);
  dirtyKeys.add(key);
  scheduleCloudFlush();
}

export function getJSON<T = unknown>(key: string): T | null {
  const raw = mmkv.getString(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setJSON(key: string, value: unknown): void {
  mmkv.set(key, JSON.stringify(value));
  dirtyKeys.add(key);
  scheduleCloudFlush();
}

export function remove(key: string): void {
  mmkv.remove(key);
  dirtyKeys.add(key);
  scheduleCloudFlush();
}

export function getAllKeys(): string[] {
  return mmkv.getAllKeys();
}

// ───────── Async cloud-aware operations ─────────

// Fetch from cloud if missing locally. Use this when you need
// guaranteed-fresh data (e.g. cross-device sync on app open) rather than
// the cached mmkv value.
export async function getStringFresh(key: string): Promise<string | undefined> {
  if (!getPicoCapabilities().storage) return mmkv.getString(key);
  try {
    const cloud = require('@expo-pico/storage');
    const result = await cloud.loadEntry?.(key);
    if (result?.value != null) {
      mmkv.set(key, String(result.value));
      return String(result.value);
    }
  } catch {
    // fall through to mmkv
  }
  return mmkv.getString(key);
}

// Drain the dirty set, writing each touched key to cloud storage. Deletions
// (mmkv hole) become cloud deleteEntry calls.
export async function syncToCloud(): Promise<{ pushed: number; failed: number }> {
  if (!getPicoCapabilities().storage) return { pushed: 0, failed: 0 };
  if (dirtyKeys.size === 0) return { pushed: 0, failed: 0 };
  let cloud: any;
  try {
    cloud = require('@expo-pico/storage');
  } catch {
    return { pushed: 0, failed: 0 };
  }
  let pushed = 0;
  let failed = 0;
  const keys = Array.from(dirtyKeys);
  for (const key of keys) {
    try {
      if (mmkv.contains(key)) {
        await cloud.saveEntry?.(key, mmkv.getString(key));
      } else {
        await cloud.deleteEntry?.(key);
      }
      dirtyKeys.delete(key);
      pushed++;
    } catch {
      failed++;
    }
  }
  return { pushed, failed };
}

// Pull all cloud entries into mmkv. Call once at app boot to warm the
// cache so subsequent sync reads are hits.
export async function hydrateFromCloud(): Promise<{ pulled: number }> {
  if (!getPicoCapabilities().storage) return { pulled: 0 };
  try {
    const cloud = require('@expo-pico/storage');
    const keys: string[] = (await cloud.listKeys?.()) ?? [];
    let pulled = 0;
    for (const key of keys) {
      try {
        const result = await cloud.loadEntry?.(key);
        if (result?.value != null) {
          mmkv.set(key, String(result.value));
          pulled++;
        }
      } catch {
        // skip
      }
    }
    return { pulled };
  } catch {
    return { pulled: 0 };
  }
}

// ───────── React hooks ─────────

// Reactive read: returns the current mmkv value and re-renders the
// subscriber when the key changes. setValue writes through both tiers.
export function useStorageEntry<T extends string | number | boolean>(
  key: string,
  initialValue?: T,
): [T | undefined, (next: T) => void] {
  const [value, setValueLocal] = useState<T | undefined>(() => {
    const raw = mmkv.getString(key);
    if (raw == null) return initialValue;
    if (typeof initialValue === 'number') return Number(raw) as T;
    if (typeof initialValue === 'boolean') return (raw === 'true') as T;
    return raw as T;
  });

  useEffect(() => {
    const listener = mmkv.addOnValueChangedListener((changedKey: string) => {
      if (changedKey !== key) return;
      const raw = mmkv.getString(key);
      if (raw == null) {
        setValueLocal(undefined);
      } else if (typeof initialValue === 'number') {
        setValueLocal(Number(raw) as T);
      } else if (typeof initialValue === 'boolean') {
        setValueLocal((raw === 'true') as T);
      } else {
        setValueLocal(raw as T);
      }
    });
    return () => listener.remove();
  }, [key, initialValue]);

  return [
    value,
    (next: T) => {
      mmkv.set(key, String(next));
      dirtyKeys.add(key);
      scheduleCloudFlush();
    },
  ];
}

export const picoStorage = {
  // raw mmkv handle, exposed for callers that need batch ops
  raw: mmkv,
  getString,
  setString,
  getNumber,
  setNumber,
  getBoolean,
  setBoolean,
  getJSON,
  setJSON,
  remove,
  getAllKeys,
  getStringFresh,
  syncToCloud,
  hydrateFromCloud,
};
