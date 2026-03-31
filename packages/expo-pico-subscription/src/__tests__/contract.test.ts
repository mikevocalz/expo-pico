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
  packageName: 'expo-pico-subscription',
  api: api as unknown as Record<string, unknown>,
  availabilityMethod: 'isSubscriptionAvailable',
  versionMethod: 'getSubscriptionSdkVersion',
  asyncMethods: [
    ['getSubscriptionProducts', ['sku_monthly']],
    'getActiveSubscriptions',
    ['getSubscriptionEntitlement', 'sku_monthly'],
  ],
  listenerMethods: [],
  seamMethods: [
    ['subscribe', { sku: 'sku_monthly' }],
    ['cancelSubscription', 'sku_monthly'],
  ],
});
