// The Nitro spec in PicoStorage.nitro.ts is the single source for these
// shapes; this module keeps the `./types` import path stable.
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
