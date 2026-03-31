# expo-pico-storage

PICO platform cloud storage APIs for Expo apps — save, load, sync, and manage key-value data on PICO OS 6 devices.

# API documentation

- [Documentation for the latest stable release](https://docs.expo.dev/versions/latest/sdk/pico-storage/)
- [Documentation for the main branch](https://docs.expo.dev/versions/unversioned/sdk/pico-storage/)

# Installation in managed Expo projects

For [managed](https://docs.expo.dev/archive/managed-vs-bare/) Expo projects, please follow the installation instructions in the [API documentation for the latest stable release](#api-documentation). If you follow the link and there is no documentation available then this library is not yet usable within managed projects &mdash; it is likely to be included in an upcoming Expo SDK release.

# Installation in bare React Native projects

For bare React Native projects, you must ensure that you have [installed and configured the `expo` package](https://docs.expo.dev/bare/installing-expo-modules/) before continuing.

### Add the package to your npm dependencies

```
npm install expo-pico-storage
```

### Configure for Android

Add `expo-pico-core` and `expo-pico-storage` to your `app.config.ts` plugins array. `expo-pico-core` must appear first:

```ts
export default {
  plugins: [
    ['expo-pico-core', { picoAppId: 'your-pico-app-id', buildVariant: 'pico' }],
    'expo-pico-storage',
  ],
};
```

Then run:

```
npx expo prebuild --clean
```

## Usage

```ts
import {
  isStorageAvailable,
  saveEntry,
  loadEntry,
  deleteEntry,
  listKeys,
  syncStorage,
  getStorageQuota,
  addStorageConflictListener,
  addStorageSyncCompleteListener,
} from 'expo-pico-storage';

if (isStorageAvailable()) {
  // Save a value (server-wins conflict policy by default)
  const saved = await saveEntry('player_settings', JSON.stringify({ volume: 0.8 }));
  console.log('Saved at version:', saved.version);

  // Load a value
  const result = await loadEntry('player_settings');
  if (result.found) {
    const settings = JSON.parse(result.value!);
  }

  // List all keys
  const keys = await listKeys();

  // Force a full sync and check quota
  const syncResult = await syncStorage();
  console.log('Synced:', syncResult.syncedCount, 'conflicts:', syncResult.conflictCount);

  const quota = await getStorageQuota();
  console.log(`${quota.usedBytes} / ${quota.totalBytes} bytes used`);

  // Listen for conflict events
  const conflictSub = addStorageConflictListener((event) => {
    console.log('Conflict on key:', event.key, 'server wins:', event.serverValue);
  });
  // Later: conflictSub.remove();
}
```

## API

| Function | Description |
| --- | --- |
| `isStorageAvailable()` | Returns `true` on a PICO build with the Storage SDK linked |
| `getStorageSdkVersion()` | Returns the PICO Platform SDK version string |
| `getStorageStatus()` | Returns `StorageStatus`: `'available'` or `'unavailable'` |
| `saveEntry(key, value, options?)` | Saves a string value; returns version and conflict info |
| `loadEntry(key)` | Loads a value by key; returns `found: false` if missing |
| `deleteEntry(key)` | Deletes a key from local and cloud storage |
| `listKeys()` | Returns all stored keys |
| `syncStorage()` | Forces a cloud sync; returns counts of synced, conflicted, and errored entries |
| `getStorageQuota()` | Returns byte and entry counts for the current quota |
| `clearLocalCache()` | Clears the local cache without deleting cloud data |
| `addStorageConflictListener(cb)` | Fires when a server/client conflict is detected; returns `Subscription` |
| `addStorageSyncProgressListener(cb)` | Fires during sync with phase and progress; returns `Subscription` |
| `addStorageSyncCompleteListener(cb)` | Fires when a sync cycle completes; returns `Subscription` |

### Conflict policies

`saveEntry` accepts a `conflictPolicy` option:

| Policy | Behavior |
| --- | --- |
| `'server-wins'` (default) | Server value is kept when versions conflict |
| `'client-wins'` | Client value overwrites the server |
| `'manual'` | Conflict is surfaced via `addStorageConflictListener` for app-level resolution |

## Limitations

- Android only (PICO is an Android platform)
- New Architecture only (`newArchEnabled: true` required)
- Requires `expo-pico-core` as a peer dependency
- Bridge methods return `NOT_IMPLEMENTED` until the PICO Platform SDK AAR is linked

# Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide]( https://github.com/expo/expo#contributing).
