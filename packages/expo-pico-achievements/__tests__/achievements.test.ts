jest.mock('expo-modules-core', () => ({
  ...jest.requireActual('expo-modules-core'),
  requireNativeModule: jest.fn(() => ({
    achievementsSdkAvailable: false,
    achievementsSdkVersion: 'unavailable',
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
  isAchievementsAvailable,
  getAchievementsSdkVersion,
  getAllAchievements,
  getAchievementProgress,
  unlockAchievement,
  addAchievementCount,
  addAchievementBitfield,
  getUnlockedAchievements,
} from '../src/index';

describe('@expo-pico/achievements', () => {
  it('isAchievementsAvailable returns false when SDK not present', () => {
    expect(isAchievementsAvailable()).toBe(false);
  });

  it('getAchievementsSdkVersion returns unavailable when SDK not present', () => {
    expect(getAchievementsSdkVersion()).toBe('unavailable');
  });

  it('getAllAchievements throws extension seam error', async () => {
    await expect(getAllAchievements()).rejects.toThrow('expo-pico-achievements: getAllAchievements()');
  });

  it('getAchievementProgress throws extension seam error', async () => {
    await expect(getAchievementProgress(['ach_1'])).rejects.toThrow('expo-pico-achievements: getAchievementProgress()');
  });

  it('unlockAchievement throws extension seam error', async () => {
    await expect(unlockAchievement('ach_1')).rejects.toThrow('expo-pico-achievements: unlockAchievement()');
  });

  it('addAchievementCount throws extension seam error', async () => {
    await expect(addAchievementCount('ach_1', 5)).rejects.toThrow('expo-pico-achievements: addAchievementCount()');
  });

  it('addAchievementBitfield throws extension seam error', async () => {
    await expect(addAchievementBitfield('ach_1', '101')).rejects.toThrow('expo-pico-achievements: addAchievementBitfield()');
  });

  it('getUnlockedAchievements throws extension seam error', async () => {
    await expect(getUnlockedAchievements()).rejects.toThrow('expo-pico-achievements: getUnlockedAchievements()');
  });
});
