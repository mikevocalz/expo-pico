// Simulates a build with no PICO native library: the generated `#nitro/*`
// module asks getHybridClass for the class, and it is not registered.
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    getHybridClass: jest.fn(() => {
      throw new Error('HybridObject not available in test environment');
    }),
  },
}));
import * as api from '../index';
import { runPackageContractTests } from '@expo-pico/platform-service-common/testing';

runPackageContractTests({
  packageName: '@expo-pico/storage',
  api: api as unknown as Record<string, unknown>,
  availabilityMethod: 'isStorageAvailable',
  versionMethod: 'getStorageSdkVersion',
  asyncMethods: [
    ['saveEntry', 'key', 'value'],
    ['loadEntry', 'key'],
    ['deleteEntry', 'key'],
    'listKeys',
    'syncStorage',
    'getStorageQuota',
    'clearLocalCache',
  ],
  listenerMethods: [
    'addStorageConflictListener',
    'addStorageSyncProgressListener',
    'addStorageSyncCompleteListener',
  ],
  seamMethods: [],
});

describe('native module resolution', () => {
  it('resolves the PicoStorage Nitro hybrid class', () => {
    expect(api.isStorageAvailable()).toBe(false);
    const { NitroModules } = jest.requireMock('react-native-nitro-modules');
    expect(NitroModules.getHybridClass).toHaveBeenCalledWith('expopico.storage.PicoStorage');
  });
});
