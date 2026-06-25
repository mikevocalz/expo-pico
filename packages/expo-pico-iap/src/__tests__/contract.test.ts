jest.mock('expo', () => ({
  requireNativeModule: jest.fn(() => { throw new Error('Module not found'); }),
}));
jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn(),
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
