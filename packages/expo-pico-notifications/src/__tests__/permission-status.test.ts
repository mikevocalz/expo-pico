// The native object is present. `permissionStatus` mimics the old cached
// property, frozen at 'denied'; `getPermissionStatus` is the live method, and
// flips to 'granted' after the user accepts the prompt.
const mockGetPermissionStatus = jest.fn();

jest.mock('#nitro/PicoNotifications', () => ({
  PicoNotifications: jest.fn().mockImplementation(() => ({
    available: true,
    sdkVersion: '1.0.0',
    permissionStatus: 'denied',
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
