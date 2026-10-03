// Simulates a build with no PICO native library: the Expo module lookup
// in @expo-pico/platform-service-common returns null.
jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
}));
import * as api from '../index';
import { runPackageContractTests } from '@expo-pico/platform-service-common/testing';

runPackageContractTests({
  packageName: '@expo-pico/social',
  api: api as unknown as Record<string, unknown>,
  availabilityMethod: 'isSocialAvailable',
  versionMethod: 'getSocialSdkVersion',
  asyncMethods: [
    'getCurrentUser',
    'getFriendList',
    ['getFriendshipStatus', 'user-123'],
    ['sendFriendRequest', 'user-123'],
    ['acceptFriendRequest', 'req-123'],
    ['declineFriendRequest', 'req-123'],
    ['removeFriend', 'user-123'],
    ['blockUser', 'user-123'],
    ['unblockUser', 'user-123'],
    ['setPresence', { status: 'online' }],
    'clearPresence',
    ['sendInvites', { destinationApiName: 'lobby', userIds: ['user-123'] }],
    'getPendingFriendRequests',
  ],
  listenerMethods: [
    'addFriendPresenceChangedListener',
    'addFriendRequestReceivedListener',
    'addInviteReceivedListener',
  ],
  seamMethods: [],
});

describe('native module resolution', () => {
  it('resolves the ExpoPicoSocial Expo module', () => {
    const { requireOptionalNativeModule } = jest.requireMock('expo-modules-core');
    expect(requireOptionalNativeModule).toHaveBeenCalledWith('ExpoPicoSocial');
  });
});
