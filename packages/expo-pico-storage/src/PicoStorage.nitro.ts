import type { HybridObject } from 'react-native-nitro-modules';

export type StorageStatus = 'available' | 'unavailable' | 'syncing' | 'error';
export type StorageConflictPolicy = 'server-wins' | 'client-wins' | 'manual';
export type StorageEntryType = 'string' | 'number' | 'boolean' | 'json';
export type StorageSyncPhase = 'uploading' | 'downloading' | 'resolving';

export interface StorageSaveOptions {
  /** Default: 'server-wins'. */
  conflictPolicy?: StorageConflictPolicy;
  /** Default: 65536. */
  maxBytes?: number;
}

export interface StorageLoadResult {
  key: string;
  value?: string;
  version: number;
  found: boolean;
}

export interface StorageSaveResult {
  key: string;
  version: number;
  conflict: boolean;
  resolvedValue: string;
}

export interface StorageQuota {
  usedBytes: number;
  totalBytes: number;
  entryCount: number;
  maxEntries: number;
}

export interface StorageSyncResult {
  syncedCount: number;
  conflictCount: number;
  errorCount: number;
  syncedAt: number;
}

export interface StorageConflictEvent {
  key: string;
  clientValue: string;
  serverValue: string;
  clientVersion: number;
  serverVersion: number;
}

export interface StorageSyncProgressEvent {
  phase: StorageSyncPhase;
  completedCount: number;
  totalCount: number;
}

/**
 * PPS 1.0.x removed cloud storage. Every method returns NOT_IN_PPS_1_0 today.
 * Back per-player state with your own service keyed off the account userId,
 * or expo-secure-store for local-only data.
 */
export interface PicoStorage extends HybridObject<{ android: 'kotlin' }> {
  readonly available: boolean;
  readonly sdkVersion: string;
  readonly status: StorageStatus;

  saveEntry(
    key: string,
    value: string,
    type: StorageEntryType,
    options?: StorageSaveOptions
  ): Promise<StorageSaveResult>;
  loadEntry(key: string): Promise<StorageLoadResult>;
  deleteEntry(key: string): Promise<void>;
  listKeys(): Promise<string[]>;
  syncStorage(): Promise<StorageSyncResult>;
  getStorageQuota(): Promise<StorageQuota>;
  clearLocalCache(): Promise<void>;

  addStorageConflictListener(listener: (event: StorageConflictEvent) => void): number;
  addStorageSyncProgressListener(listener: (event: StorageSyncProgressEvent) => void): number;
  addStorageSyncCompleteListener(listener: (result: StorageSyncResult) => void): number;
  removeListener(id: number): void;
}
