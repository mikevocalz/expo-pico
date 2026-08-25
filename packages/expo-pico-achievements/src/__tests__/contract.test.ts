jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => {
      throw new Error('HybridObject not available in test environment');
    }),
  },
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
