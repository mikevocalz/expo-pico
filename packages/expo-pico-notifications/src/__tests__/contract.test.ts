// Simulates a build with no PICO native library: the Expo module lookup
// in @expo-pico/platform-service-common returns null.
jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
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

describe('native module resolution', () => {
  it('resolves the ExpoPicoNotifications Expo module', () => {
    const { requireOptionalNativeModule } = jest.requireMock('expo-modules-core');
    expect(requireOptionalNativeModule).toHaveBeenCalledWith('ExpoPicoNotifications');
  });
});
