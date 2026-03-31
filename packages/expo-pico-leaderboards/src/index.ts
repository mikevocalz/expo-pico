import {
  guardService,
  wrapNativeCall,
  DEFAULT_PAGE_SIZE,
  type PicoPage,
} from '@expo-pico/platform-service-common';
import { NativeLeaderboards } from './ExpoPicoLeaderboardsModule';
import type {
  Leaderboard,
  LeaderboardEntry,
  WriteScoreOptions,
  WriteScoreResult,
  GetEntriesOptions,
  LeaderboardEntryPage,
} from './types';

export * from './types';
export type { PicoPage };

const PKG = 'expo-pico-leaderboards';

// ─── Availability ─────────────────────────────────────────────────────────────

export function isLeaderboardsAvailable(): boolean {
  return NativeLeaderboards?.leaderboardsSdkAvailable ?? false;
}

export function getLeaderboardsSdkVersion(): string {
  return NativeLeaderboards?.leaderboardsSdkVersion ?? 'unavailable';
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllLeaderboards(): Promise<Leaderboard[]> {
  guardService(isLeaderboardsAvailable(), PKG, 'getAllLeaderboards');
  const raw = await wrapNativeCall(PKG, 'getAllLeaderboards', NativeLeaderboards!.getAllLeaderboards());
  return raw as unknown as Leaderboard[];
}

export async function getEntries(
  apiName: string,
  options?: GetEntriesOptions
): Promise<LeaderboardEntryPage> {
  guardService(isLeaderboardsAvailable(), PKG, 'getEntries');
  const raw = await wrapNativeCall(
    PKG, 'getEntries',
    NativeLeaderboards!.getEntries(
      apiName,
      options?.filter ?? 'none',
      options?.startAt ?? 'top',
      options?.pageSize ?? DEFAULT_PAGE_SIZE,
      options?.pageToken ?? null
    )
  );
  return raw as unknown as LeaderboardEntryPage;
}

export async function getEntriesAfterRank(
  apiName: string,
  afterRank: number,
  options?: Pick<GetEntriesOptions, 'pageSize' | 'pageToken'>
): Promise<LeaderboardEntryPage> {
  guardService(isLeaderboardsAvailable(), PKG, 'getEntriesAfterRank');
  const raw = await wrapNativeCall(
    PKG, 'getEntriesAfterRank',
    NativeLeaderboards!.getEntriesAfterRank(
      apiName,
      afterRank,
      options?.pageSize ?? DEFAULT_PAGE_SIZE,
      options?.pageToken ?? null
    )
  );
  return raw as unknown as LeaderboardEntryPage;
}

export async function getUserEntry(apiName: string): Promise<LeaderboardEntry | null> {
  guardService(isLeaderboardsAvailable(), PKG, 'getUserEntry');
  const raw = await wrapNativeCall(PKG, 'getUserEntry', NativeLeaderboards!.getUserEntry(apiName));
  return raw as unknown as LeaderboardEntry | null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function writeScore(
  apiName: string,
  score: number,
  options?: WriteScoreOptions
): Promise<WriteScoreResult> {
  guardService(isLeaderboardsAvailable(), PKG, 'writeScore');
  const raw = await wrapNativeCall(
    PKG, 'writeScore',
    NativeLeaderboards!.writeScore(
      apiName,
      score,
      options?.extraData ?? null,
      options?.supplementaryMetric ?? null,
      options?.forceUpdate ?? false
    )
  );
  return raw as unknown as WriteScoreResult;
}
