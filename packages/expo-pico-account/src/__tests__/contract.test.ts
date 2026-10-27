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
  packageName: '@expo-pico/account',
  api: api as unknown as Record<string, unknown>,
  availabilityMethod: 'isAccountAvailable',
  versionMethod: 'getAccountSdkVersion',
  asyncMethods: ['getUserProfile', 'getAccountLinkStatus', 'login', 'getAccessToken', 'logout'],
  listenerMethods: [],
  seamMethods: [],
});

describe('native module resolution', () => {
  it('resolves the PicoAccount Nitro hybrid class', () => {
    expect(api.isAccountAvailable()).toBe(false);
    const { NitroModules } = jest.requireMock('react-native-nitro-modules');
    expect(NitroModules.getHybridClass).toHaveBeenCalledWith('expopico.account.PicoAccount');
  });
});
