jest.mock('expo-modules-core', () => ({
  ...jest.requireActual('expo-modules-core'),
  requireNativeModule: jest.fn(() => ({
    leaderboardsSdkAvailable: false,
    leaderboardsSdkVersion: 'unavailable',
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
  isLeaderboardsAvailable,
  getLeaderboardsSdkVersion,
  getAllLeaderboards,
  writeScore,
  getEntries,
  getEntriesAfterRank,
  getUserEntry,
} from '../src/index';

describe('@expo-pico/leaderboards', () => {
  it('isLeaderboardsAvailable returns false when SDK not present', () => {
    expect(isLeaderboardsAvailable()).toBe(false);
  });

  it('getLeaderboardsSdkVersion returns unavailable when SDK not present', () => {
    expect(getLeaderboardsSdkVersion()).toBe('unavailable');
  });

  it('getAllLeaderboards throws extension seam error', async () => {
    await expect(getAllLeaderboards()).rejects.toThrow('@expo-pico/leaderboards: getAllLeaderboards()');
  });

  it('writeScore throws extension seam error', async () => {
    await expect(writeScore('board_1', 9999)).rejects.toThrow('@expo-pico/leaderboards: writeScore()');
  });

  it('getEntries throws extension seam error', async () => {
    await expect(getEntries('board_1')).rejects.toThrow('@expo-pico/leaderboards: getEntries()');
  });

  it('getEntriesAfterRank throws extension seam error', async () => {
    await expect(getEntriesAfterRank('board_1', 10)).rejects.toThrow('@expo-pico/leaderboards: getEntriesAfterRank()');
  });

  it('getUserEntry throws extension seam error', async () => {
    await expect(getUserEntry('board_1')).rejects.toThrow('@expo-pico/leaderboards: getUserEntry()');
  });
});
