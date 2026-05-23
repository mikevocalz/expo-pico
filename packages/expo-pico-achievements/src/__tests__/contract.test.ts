jest.mock('expo', () => ({
  requireNativeModule: jest.fn(() => { throw new Error('Module not found'); }),
}));
jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
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
