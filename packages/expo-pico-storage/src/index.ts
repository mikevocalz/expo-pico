import {
  guardService,
  wrapNativeCall,
  safeAddListener,
  createNativeEventEmitter,
  type Subscription,
} from '@expo-pico/platform-service-common';
import { NativeStorage } from './ExpoPicoStorageModule';
import type {
  StorageStatus,
  StorageSaveOptions,
  StorageLoadResult,
  StorageSaveResult,
  StorageQuota,
  StorageSyncResult,
  StorageConflictEvent,
  StorageSyncProgressEvent,
} from './types';

export * from './types';
export type { Subscription };

const PKG = '@expo-pico/storage';
const emitter = createNativeEventEmitter(NativeStorage);

// ─── Availability ─────────────────────────────────────────────────────────────

export function isStorageAvailable(): boolean {
  return NativeStorage?.storageSdkAvailable ?? false;
}

export function getStorageSdkVersion(): string {
  return NativeStorage?.storageSdkVersion ?? 'unavailable';
}

export function getStorageStatus(): StorageStatus {
  if (!NativeStorage?.storageSdkAvailable) return 'unavailable';
  return 'available';
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function saveEntry(
  key: string,
  value: string,
  options?: StorageSaveOptions
): Promise<StorageSaveResult> {
  guardService(isStorageAvailable(), PKG, 'saveEntry');
  const raw = await wrapNativeCall(
    PKG, 'saveEntry',
    NativeStorage!.saveEntry(
      key,
      value,
      options?.conflictPolicy ?? 'server-wins',
      options?.maxBytes ?? 65536
    )
  );
  return raw as unknown as StorageSaveResult;
}

export async function loadEntry(key: string): Promise<StorageLoadResult> {
  guardService(isStorageAvailable(), PKG, 'loadEntry');
  const raw = await wrapNativeCall(PKG, 'loadEntry', NativeStorage!.loadEntry(key));
  return raw as unknown as StorageLoadResult;
}

export async function deleteEntry(key: string): Promise<void> {
  guardService(isStorageAvailable(), PKG, 'deleteEntry');
  await wrapNativeCall(PKG, 'deleteEntry', NativeStorage!.deleteEntry(key));
}

export async function listKeys(): Promise<string[]> {
  guardService(isStorageAvailable(), PKG, 'listKeys');
  const raw = await wrapNativeCall(PKG, 'listKeys', NativeStorage!.listKeys());
  return raw as unknown as string[];
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export async function syncStorage(): Promise<StorageSyncResult> {
  guardService(isStorageAvailable(), PKG, 'syncStorage');
  const raw = await wrapNativeCall(PKG, 'syncStorage', NativeStorage!.syncStorage());
  return raw as unknown as StorageSyncResult;
}

export async function getStorageQuota(): Promise<StorageQuota> {
  guardService(isStorageAvailable(), PKG, 'getStorageQuota');
  const raw = await wrapNativeCall(PKG, 'getStorageQuota', NativeStorage!.getStorageQuota());
  return raw as unknown as StorageQuota;
}

export async function clearLocalCache(): Promise<void> {
  guardService(isStorageAvailable(), PKG, 'clearLocalCache');
  await wrapNativeCall(PKG, 'clearLocalCache', NativeStorage!.clearLocalCache());
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

export function addStorageConflictListener(
  listener: (event: StorageConflictEvent) => void
): Subscription {
  return safeAddListener<StorageConflictEvent>(emitter, 'onStorageConflict', listener);
}

export function addStorageSyncProgressListener(
  listener: (event: StorageSyncProgressEvent) => void
): Subscription {
  return safeAddListener<StorageSyncProgressEvent>(emitter, 'onStorageSyncProgress', listener);
}

export function addStorageSyncCompleteListener(
  listener: (event: StorageSyncResult) => void
): Subscription {
  return safeAddListener<StorageSyncResult>(emitter, 'onStorageSyncComplete', listener);
}
