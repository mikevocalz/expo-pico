// Simulates a build with no PICO native library: the generated `#nitro/*`
// module asks getHybridClass for the class, and it is not registered.
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    getHybridClass: jest.fn(() => {
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

describe('native module resolution', () => {
  it('resolves the PicoLeaderboards Nitro hybrid class', () => {
    expect(api.isLeaderboardsAvailable()).toBe(false);
    const { NitroModules } = jest.requireMock('react-native-nitro-modules');
    expect(NitroModules.getHybridClass).toHaveBeenCalledWith(
      'expopico.leaderboards.PicoLeaderboards'
    );
  });
});
