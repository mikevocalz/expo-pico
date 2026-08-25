import {
  guardService,
  wrapNativeCall,
  resolveHybridObject,
} from '@expo-pico/platform-service-common';
import type {
  PicoLeaderboards,
  GetEntriesOptions,
  WriteScoreOptions,
} from './PicoLeaderboards.nitro';

export type {
  Leaderboard,
  LeaderboardEntry,
  LeaderboardEntryPage,
  LeaderboardSortOrder,
  LeaderboardFilter,
  LeaderboardStartAt,
  GetEntriesOptions,
  WriteScoreOptions,
  WriteScoreResult,
} from './PicoLeaderboards.nitro';

const PKG = '@expo-pico/leaderboards';

function native(): PicoLeaderboards | null {
  return resolveHybridObject<PicoLeaderboards>('PicoLeaderboards');
}

export function isLeaderboardsAvailable(): boolean {
  return native()?.available ?? false;
}

export function getLeaderboardsSdkVersion(): string {
  return native()?.sdkVersion ?? 'unavailable';
}

export async function getAllLeaderboards() {
  guardService(isLeaderboardsAvailable(), PKG, 'getAllLeaderboards');
  return wrapNativeCall(PKG, 'getAllLeaderboards', native()!.getAllLeaderboards());
}

export async function getEntries(apiName: string, options?: GetEntriesOptions) {
  guardService(isLeaderboardsAvailable(), PKG, 'getEntries');
  return wrapNativeCall(PKG, 'getEntries', native()!.getEntries(apiName, options));
}

export async function getEntriesAfterRank(
  apiName: string,
  afterRank: number,
  options?: GetEntriesOptions
) {
  guardService(isLeaderboardsAvailable(), PKG, 'getEntriesAfterRank');
  return wrapNativeCall(
    PKG,
    'getEntriesAfterRank',
    native()!.getEntriesAfterRank(apiName, afterRank, options)
  );
}

/** Emulated by scanning entries — PPS has no single-user lookup. */
export async function getUserEntry(apiName: string) {
  guardService(isLeaderboardsAvailable(), PKG, 'getUserEntry');
  return wrapNativeCall(PKG, 'getUserEntry', native()!.getUserEntry(apiName));
}

export async function writeScore(apiName: string, score: number, options?: WriteScoreOptions) {
  guardService(isLeaderboardsAvailable(), PKG, 'writeScore');
  return wrapNativeCall(PKG, 'writeScore', native()!.writeScore(apiName, score, options));
}
