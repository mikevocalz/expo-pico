jest.mock('expo-modules-core', () => ({
  ...jest.requireActual('expo-modules-core'),
  requireNativeModule: jest.fn(() => ({
    socialSdkAvailable: false,
    socialSdkVersion: 'unavailable',
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  })),
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeAllListeners: jest.fn(),
    emit: jest.fn(),
  })),
}));

import {
  isSocialAvailable,
  getSocialSdkVersion,
  getCurrentUser,
  getFriendList,
  getFriendshipStatus,
  sendFriendRequest,
  sendInvites,
  setPresence,
} from '../src/index';

describe('@expo-pico/social', () => {
  it('isSocialAvailable returns false when SDK not present', () => {
    expect(isSocialAvailable()).toBe(false);
  });

  it('getSocialSdkVersion returns unavailable when SDK not present', () => {
    expect(getSocialSdkVersion()).toBe('unavailable');
  });

  it('getCurrentUser throws extension seam error', async () => {
    await expect(getCurrentUser()).rejects.toThrow('expo-pico-social: getCurrentUser()');
  });

  it('getFriendList throws extension seam error', async () => {
    await expect(getFriendList()).rejects.toThrow('expo-pico-social: getFriendList()');
  });

  it('getFriendshipStatus throws extension seam error', async () => {
    await expect(getFriendshipStatus('user-123')).rejects.toThrow('expo-pico-social: getFriendshipStatus()');
  });

  it('sendFriendRequest throws extension seam error', async () => {
    await expect(sendFriendRequest('user-123')).rejects.toThrow('expo-pico-social: sendFriendRequest()');
  });

  it('sendInvites throws extension seam error', async () => {
    await expect(sendInvites({ destinationApiName: 'lobby', userIds: ['u1'] })).rejects.toThrow('expo-pico-social: sendInvites()');
  });

  it('setPresence throws extension seam error', async () => {
    await expect(setPresence({ status: 'online' })).rejects.toThrow('expo-pico-social: setPresence()');
  });
});
