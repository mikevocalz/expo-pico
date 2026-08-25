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
  packageName: '@expo-pico/subscription',
  api: api as unknown as Record<string, unknown>,
  availabilityMethod: 'isSubscriptionAvailable',
  versionMethod: 'getSubscriptionSdkVersion',
  asyncMethods: [
    ['getSubscriptionProducts', ['sku_monthly']],
    'getActiveSubscriptions',
    ['getSubscriptionEntitlement', 'sku_monthly'],
    ['subscribe', { sku: 'sku_monthly' }],
    ['cancelSubscription', 'sku_monthly'],
  ],
  listenerMethods: [],
  seamMethods: [],
});
