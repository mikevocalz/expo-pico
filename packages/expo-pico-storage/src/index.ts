import {
  guardService,
  wrapNativeCall,
  resolveHybridObject,
  NULL_SUBSCRIPTION,
  type Subscription,
} from '@expo-pico/platform-service-common';
import type {
  PicoStorage,
  StorageStatus,
  StorageEntryType,
  StorageSaveOptions,
  StorageConflictEvent,
  StorageSyncProgressEvent,
  StorageSyncResult,
} from './PicoStorage.nitro';

export type {
  StorageStatus,
  StorageConflictPolicy,
  StorageEntryType,
  StorageSyncPhase,
  StorageSaveOptions,
  StorageLoadResult,
  StorageSaveResult,
  StorageQuota,
  StorageSyncResult,
  StorageConflictEvent,
  StorageSyncProgressEvent,
} from './PicoStorage.nitro';

const PKG = '@expo-pico/storage';

function native(): PicoStorage | null {
  return resolveHybridObject<PicoStorage>('PicoStorage');
}

export function isStorageAvailable(): boolean {
  return native()?.available ?? false;
}

export function getStorageSdkVersion(): string {
  return native()?.sdkVersion ?? 'unavailable';
}

export function getStorageStatus(): StorageStatus {
  return native()?.status ?? 'unavailable';
}

export async function saveEntry(
  key: string,
  value: string,
  type: StorageEntryType,
  options?: StorageSaveOptions
) {
  guardService(isStorageAvailable(), PKG, 'saveEntry');
  return wrapNativeCall(PKG, 'saveEntry', native()!.saveEntry(key, value, type, options));
}

export async function loadEntry(key: string) {
  guardService(isStorageAvailable(), PKG, 'loadEntry');
  return wrapNativeCall(PKG, 'loadEntry', native()!.loadEntry(key));
}

export async function deleteEntry(key: string): Promise<void> {
  guardService(isStorageAvailable(), PKG, 'deleteEntry');
  await wrapNativeCall(PKG, 'deleteEntry', native()!.deleteEntry(key));
}

export async function listKeys() {
  guardService(isStorageAvailable(), PKG, 'listKeys');
  return wrapNativeCall(PKG, 'listKeys', native()!.listKeys());
}

export async function syncStorage() {
  guardService(isStorageAvailable(), PKG, 'syncStorage');
  return wrapNativeCall(PKG, 'syncStorage', native()!.syncStorage());
}

export async function getStorageQuota() {
  guardService(isStorageAvailable(), PKG, 'getStorageQuota');
  return wrapNativeCall(PKG, 'getStorageQuota', native()!.getStorageQuota());
}

export async function clearLocalCache(): Promise<void> {
  guardService(isStorageAvailable(), PKG, 'clearLocalCache');
  await wrapNativeCall(PKG, 'clearLocalCache', native()!.clearLocalCache());
}

function subscribe(register: (h: PicoStorage) => number): Subscription {
  const hybrid = native();
  if (!hybrid?.available) return NULL_SUBSCRIPTION;
  const id = register(hybrid);
  return { remove: () => hybrid.removeListener(id) };
}

export function addStorageConflictListener(
  listener: (event: StorageConflictEvent) => void
): Subscription {
  return subscribe((h) => h.addStorageConflictListener(listener));
}

export function addStorageSyncProgressListener(
  listener: (event: StorageSyncProgressEvent) => void
): Subscription {
  return subscribe((h) => h.addStorageSyncProgressListener(listener));
}

export function addStorageSyncCompleteListener(
  listener: (result: StorageSyncResult) => void
): Subscription {
  return subscribe((h) => h.addStorageSyncCompleteListener(listener));
}
