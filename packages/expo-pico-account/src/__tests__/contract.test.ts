jest.mock('expo', () => ({
  requireNativeModule: jest.fn(() => { throw new Error('Module not found'); }),
}));
jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn(),
}));

import * as api from '../index';
import { runPackageContractTests } from '@expo-pico/platform-service-common/testing';

runPackageContractTests({
  packageName: '@expo-pico/account',
  api: api as unknown as Record<string, unknown>,
  availabilityMethod: 'isAccountAvailable',
  versionMethod: 'getAccountSdkVersion',
  asyncMethods: [
    'getUserProfile',
    'getAccountLinkStatus',
    'login',
    'getAccessToken',
    'logout',
  ],
  listenerMethods: [],
  seamMethods: [],
});
