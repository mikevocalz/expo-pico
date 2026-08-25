jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => {
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
