// Simulates a build with no PICO native library present.
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => {
      throw new Error('HybridObject not available in test environment');
    }),
  },
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
  seamMethods: [
    ['requestMatchmaking', { poolName: 'default' }],
    'cancelMatchmaking',
  ],
});

describe('getRoomSessionState default state', () => {
  it('returns typed default when native is unavailable', () => {
    const state = api.getRoomSessionState();
    expect(state.connectionState).toBe('disconnected');
    expect(state.roomId).toBeNull();
    expect(state.memberCount).toBe(0);
    expect(state.role).toBeNull();
  });

  it('does not throw when native is unavailable', () => {
    expect(() => api.getRoomSessionState()).not.toThrow();
  });
});
