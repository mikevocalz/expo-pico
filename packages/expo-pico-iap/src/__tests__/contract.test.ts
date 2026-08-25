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
