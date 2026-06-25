jest.mock('expo-modules-core', () => ({
  ...jest.requireActual('expo-modules-core'),
  requireNativeModule: jest.fn(() => ({
    storageSdkAvailable: false,
    storageSdkVersion: 'unavailable',
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  })),
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeAllListeners: jest.fn(),
    emit: jest.fn(),
  })),
}));

import {
  isStorageAvailable,
  getStorageSdkVersion,
  getStorageStatus,
  saveEntry,
  loadEntry,
  deleteEntry,
  listKeys,
  syncStorage,
  getStorageQuota,
  clearLocalCache,
} from '../src/index';

describe('@expo-pico/storage', () => {
  it('isStorageAvailable returns false when SDK not present', () => {
    expect(isStorageAvailable()).toBe(false);
  });

  it('getStorageSdkVersion returns unavailable when SDK not present', () => {
    expect(getStorageSdkVersion()).toBe('unavailable');
  });

  it('getStorageStatus returns unavailable when SDK not present', () => {
    expect(getStorageStatus()).toBe('unavailable');
  });

  it('saveEntry throws extension seam error', async () => {
    await expect(saveEntry('key', 'value')).rejects.toThrow('@expo-pico/storage: saveEntry()');
  });

  it('loadEntry throws extension seam error', async () => {
    await expect(loadEntry('key')).rejects.toThrow('@expo-pico/storage: loadEntry()');
  });

  it('deleteEntry throws extension seam error', async () => {
    await expect(deleteEntry('key')).rejects.toThrow('@expo-pico/storage: deleteEntry()');
  });

  it('listKeys throws extension seam error', async () => {
    await expect(listKeys()).rejects.toThrow('@expo-pico/storage: listKeys()');
  });

  it('syncStorage throws extension seam error', async () => {
    await expect(syncStorage()).rejects.toThrow('@expo-pico/storage: syncStorage()');
  });

  it('getStorageQuota throws extension seam error', async () => {
    await expect(getStorageQuota()).rejects.toThrow('@expo-pico/storage: getStorageQuota()');
  });

  it('clearLocalCache throws extension seam error', async () => {
    await expect(clearLocalCache()).rejects.toThrow('@expo-pico/storage: clearLocalCache()');
  });
});
