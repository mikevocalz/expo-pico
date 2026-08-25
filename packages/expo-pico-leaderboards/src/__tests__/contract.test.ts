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
  packageName: '@expo-pico/leaderboards',
  api: api as unknown as Record<string, unknown>,
  availabilityMethod: 'isLeaderboardsAvailable',
  versionMethod: 'getLeaderboardsSdkVersion',
  asyncMethods: [
    'getAllLeaderboards',
    ['getEntries', 'board_1'],
    ['getEntriesAfterRank', 'board_1', 10],
    ['getUserEntry', 'board_1'],
    ['writeScore', 'board_1', 1000],
  ],
  listenerMethods: [],
  seamMethods: [],
});
