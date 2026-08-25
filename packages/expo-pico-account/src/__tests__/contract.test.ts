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
  packageName: '@expo-pico/account',
  api: api as unknown as Record<string, unknown>,
  availabilityMethod: 'isAccountAvailable',
  versionMethod: 'getAccountSdkVersion',
  asyncMethods: ['getUserProfile', 'getAccountLinkStatus', 'login', 'getAccessToken', 'logout'],
  listenerMethods: [],
  seamMethods: [],
});
