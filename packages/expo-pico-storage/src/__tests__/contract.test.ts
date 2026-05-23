jest.mock('expo', () => ({
  requireNativeModule: jest.fn(() => { throw new Error('Module not found'); }),
}));
jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
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
