// Simulates a build with no PICO native library: the Expo module lookup
// in @expo-pico/platform-service-common returns null.
jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
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
  it('resolves the ExpoPicoStorage Expo module', () => {
    const { requireOptionalNativeModule } = jest.requireMock('expo-modules-core');
    expect(requireOptionalNativeModule).toHaveBeenCalledWith('ExpoPicoStorage');
  });
});
