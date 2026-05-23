jest.mock('expo', () => ({
  requireNativeModule: jest.fn(() => { throw new Error('Module not found'); }),
}));
jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn(),
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
