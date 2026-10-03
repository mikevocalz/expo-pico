// Simulates a build with no PICO native library: the Expo module lookup
// in @expo-pico/platform-service-common returns null.
jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
}));

// Ensure @expo-pico/platform-service-common uses real implementations
jest.unmock('@expo-pico/platform-service-common');

import * as api from '../index';
import { runPackageContractTests } from '@expo-pico/platform-service-common/testing';

runPackageContractTests({
  packageName: '@expo-pico/rooms',
  api: api as unknown as Record<string, unknown>,
  availabilityMethod: 'isRoomsAvailable',
  versionMethod: 'getRoomsSdkVersion',
  asyncMethods: [
    'createRoom',
    'joinRoom',
    ['joinRoom', 'room-id-123'],
    ['getRoomInfo', 'room-id-123'],
    ['kickUser', 'user-id-123'],
    ['updateRoomData', { key: 'value' }],
    'leaveRoom',
  ],
  listenerMethods: [
    'addRoomUpdatedListener',
    'addRoomUserJoinedListener',
    'addRoomUserLeftListener',
    'addMatchmakingFoundListener',
  ],
  seamMethods: [['requestMatchmaking', { poolName: 'default' }], 'cancelMatchmaking'],
});

describe('getRoomSessionState default state', () => {
  it('returns typed default when native is unavailable', () => {
    const state = api.getRoomSessionState();
    // roomId and role are optional on RoomSessionState, so an absent value
    // is undefined rather than null.
    expect(state.connectionState).toBe('disconnected');
    expect(state.roomId).toBeUndefined();
    expect(state.memberCount).toBe(0);
    expect(state.role).toBeUndefined();
  });

  it('does not throw when native is unavailable', () => {
    expect(() => api.getRoomSessionState()).not.toThrow();
  });
});

describe('native module resolution', () => {
  it('resolves the ExpoPicoRooms Expo module', () => {
    const { requireOptionalNativeModule } = jest.requireMock('expo-modules-core');
    expect(requireOptionalNativeModule).toHaveBeenCalledWith('ExpoPicoRooms');
  });
});
