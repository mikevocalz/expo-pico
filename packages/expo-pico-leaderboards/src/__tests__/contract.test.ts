// Simulates a build with no PICO native library: the Expo module lookup
// in @expo-pico/platform-service-common returns null.
jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
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
  it('resolves the ExpoPicoLeaderboards Expo module', () => {
    const { requireOptionalNativeModule } = jest.requireMock('expo-modules-core');
    expect(requireOptionalNativeModule).toHaveBeenCalledWith('ExpoPicoLeaderboards');
  });
});
