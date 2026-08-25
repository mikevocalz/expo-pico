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
  packageName: '@expo-pico/notifications',
  api: api as unknown as Record<string, unknown>,
  availabilityMethod: 'isNotificationsAvailable',
  versionMethod: 'getNotificationsSdkVersion',
  asyncMethods: ['requestPermissions', 'registerForPushNotifications'],
  listenerMethods: [],
  seamMethods: [],
});

describe('getNotificationPermissionStatus default', () => {
  it('returns not-determined when native is unavailable', () => {
    expect(api.getNotificationPermissionStatus()).toBe('not-determined');
  });

  it('does not throw when native unavailable', () => {
    expect(() => api.getNotificationPermissionStatus()).not.toThrow();
  });
});
