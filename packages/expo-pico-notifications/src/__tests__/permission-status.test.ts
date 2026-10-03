// The native module is present. `notificationPermissionStatus` mimics the old
// module-load constant, frozen at 'denied'; `getPermissionStatus` is the live
// sync Function, and flips to 'granted' after the user accepts the prompt.
const mockGetPermissionStatus = jest.fn();

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => ({
    notificationsSdkAvailable: true,
    notificationsSdkVersion: '1.0.0',
    notificationPermissionStatus: 'denied',
    getPermissionStatus: mockGetPermissionStatus,
  })),
}));

import { getNotificationPermissionStatus } from '../index';

describe('getNotificationPermissionStatus', () => {
  it('reads the live native status on every call', () => {
    mockGetPermissionStatus.mockReturnValueOnce('denied').mockReturnValueOnce('granted');

    expect(getNotificationPermissionStatus()).toBe('denied');
    expect(getNotificationPermissionStatus()).toBe('granted');
    expect(mockGetPermissionStatus).toHaveBeenCalledTimes(2);
  });
});
