jest.mock('expo', () => ({
  requireNativeModule: jest.fn(() => { throw new Error('Module not found'); }),
}));
jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn(),
}));

import * as api from '../index';
import { runPackageContractTests } from '@expo-pico/platform-service-common/testing';

runPackageContractTests({
  packageName: 'expo-pico-notifications',
  api: api as unknown as Record<string, unknown>,
  availabilityMethod: 'isNotificationsAvailable',
  versionMethod: 'getNotificationsSdkVersion',
  asyncMethods: [
    'requestPermissions',
  ],
  listenerMethods: [],
  seamMethods: [
    'registerForPushNotifications',
  ],
});

describe('getNotificationPermissionStatus default', () => {
  it('returns not-determined when native is unavailable', () => {
    expect(api.getNotificationPermissionStatus()).toBe('not-determined');
  });

  it('does not throw when native unavailable', () => {
    expect(() => api.getNotificationPermissionStatus()).not.toThrow();
  });
});
