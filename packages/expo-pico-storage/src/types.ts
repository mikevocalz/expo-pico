export type StorageStatus = 'available' | 'unavailable' | 'syncing' | 'error';

export type StorageConflictPolicy = 'server-wins' | 'client-wins' | 'manual';

export type StorageEntryType = 'string' | 'number' | 'boolean' | 'json';

export interface StorageEntry {
  key: string;
  value: string;
  type: StorageEntryType;
  version: number;
  updatedAt: number;
}

export interface StorageSaveOptions {
  /** Conflict resolution policy when server has newer data. Default: 'server-wins' */
  conflictPolicy?: StorageConflictPolicy;
  /** Maximum size in bytes. Default: 65536 (64KB) */
  maxBytes?: number;
}

export interface StorageLoadResult {
  key: string;
  value: string | null;
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
  phase: 'uploading' | 'downloading' | 'resolving';
  completedCount: number;
  totalCount: number;
}
