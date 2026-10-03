// Simulates a build with no PICO native library: the Expo module lookup
// in @expo-pico/platform-service-common returns null.
jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
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

describe('native module resolution', () => {
  it('resolves the ExpoPicoSubscription Expo module', () => {
    const { requireOptionalNativeModule } = jest.requireMock('expo-modules-core');
    expect(requireOptionalNativeModule).toHaveBeenCalledWith('ExpoPicoSubscription');
  });
});
