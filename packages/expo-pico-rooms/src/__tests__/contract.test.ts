// Mock native module resolution — simulates non-PICO build
jest.mock('expo', () => ({
  requireNativeModule: jest.fn(() => { throw new Error('Module not found'); }),
}));

// Mock expo-modules-core EventEmitter
jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeAllListeners: jest.fn(),
  })),
}));

// Ensure @expo-pico/platform-service-common uses real implementations
jest.unmock('@expo-pico/platform-service-common');

import * as api from '../index';
import { runPackageContractTests } from '@expo-pico/platform-service-common/testing';

runPackageContractTests({
  packageName: 'expo-pico-rooms',
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
