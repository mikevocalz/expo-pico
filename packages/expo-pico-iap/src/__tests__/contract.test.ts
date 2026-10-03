// Simulates a build with no PICO native library: the Expo module lookup
// in @expo-pico/platform-service-common returns null.
jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
}));
import * as api from '../index';
import { runPackageContractTests } from '@expo-pico/platform-service-common/testing';

runPackageContractTests({
  packageName: '@expo-pico/iap',
  api: api as unknown as Record<string, unknown>,
  availabilityMethod: 'isIapAvailable',
  versionMethod: 'getIapSdkVersion',
  asyncMethods: [
    ['getProducts', ['sku_1']],
    ['consumePurchase', 'token_123'],
    'getPurchaseHistory',
    ['purchase', 'sku_1'],
  ],
  listenerMethods: [],
  seamMethods: [],
});

describe('native module resolution', () => {
  it('resolves the ExpoPicoIap Expo module', () => {
    const { requireOptionalNativeModule } = jest.requireMock('expo-modules-core');
    expect(requireOptionalNativeModule).toHaveBeenCalledWith('ExpoPicoIap');
  });
});
