// Simulates a build with no PICO native library: the Expo module lookup
// in @expo-pico/platform-service-common returns null.
jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
}));
import * as api from '../index';
import { runPackageContractTests } from '@expo-pico/platform-service-common/testing';

runPackageContractTests({
  packageName: '@expo-pico/achievements',
  api: api as unknown as Record<string, unknown>,
  availabilityMethod: 'isAchievementsAvailable',
  versionMethod: 'getAchievementsSdkVersion',
  asyncMethods: [
    'getAllAchievements',
    'getUnlockedAchievements',
    ['getAchievementProgress', ['ach_1']],
    ['unlockAchievement', 'ach_1'],
    ['addAchievementCount', 'ach_1', 1],
    ['addAchievementBitfield', 'ach_1', '101'],
  ],
  listenerMethods: ['addAchievementUnlockedListener'],
  seamMethods: [],
});

describe('native module resolution', () => {
  it('resolves the ExpoPicoAchievements Expo module', () => {
    const { requireOptionalNativeModule } = jest.requireMock('expo-modules-core');
    expect(requireOptionalNativeModule).toHaveBeenCalledWith('ExpoPicoAchievements');
  });
});
