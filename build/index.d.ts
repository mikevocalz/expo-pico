import { type Subscription } from '@expo-pico/platform-service-common';
import type { StorageStatus, StorageEntryType, StorageSaveOptions, StorageConflictEvent, StorageSyncProgressEvent, StorageSyncResult } from './types';
export type { StorageStatus, StorageConflictPolicy, StorageEntryType, StorageSyncPhase, StorageSaveOptions, StorageLoadResult, StorageSaveResult, StorageQuota, StorageSyncResult, StorageConflictEvent, StorageSyncProgressEvent, } from './types';
export declare function isStorageAvailable(): boolean;
export declare function getStorageSdkVersion(): string;
export declare function getStorageStatus(): StorageStatus;
export declare function saveEntry(key: string, value: string, type: StorageEntryType, options?: StorageSaveOptions): Promise<import("./types").StorageSaveResult>;
export declare function loadEntry(key: string): Promise<import("./types").StorageLoadResult>;
export declare function deleteEntry(key: string): Promise<void>;
export declare function listKeys(): Promise<string[]>;
export declare function syncStorage(): Promise<StorageSyncResult>;
export declare function getStorageQuota(): Promise<import("./types").StorageQuota>;
export declare function clearLocalCache(): Promise<void>;
export declare function addStorageConflictListener(listener: (event: StorageConflictEvent) => void): Subscription;
export declare function addStorageSyncProgressListener(listener: (event: StorageSyncProgressEvent) => void): Subscription;
export declare function addStorageSyncCompleteListener(listener: (result: StorageSyncResult) => void): Subscription;
//# sourceMappingURL=index.d.ts.map