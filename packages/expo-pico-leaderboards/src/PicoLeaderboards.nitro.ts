import type { HybridObject } from 'react-native-nitro-modules';

export type LeaderboardSortOrder = 'descending' | 'ascending';
export type LeaderboardFilter = 'none' | 'friends' | 'viewer-and-friends';
export type LeaderboardStartAt = 'top' | 'centered-on-viewer';

export interface Leaderboard {
  apiName: string;
  title: string;
  sortOrder: LeaderboardSortOrder;
}

export interface LeaderboardEntry {
  rank: number;
  score: number;
  supplementaryMetric?: number;
  /** Up to 2048 bytes of caller-supplied data. */
  extraData?: string;
  userId: string;
  displayName: string;
  isCurrentUser: boolean;
  updatedAtMs: number;
}

/** Concrete form of PicoPage<LeaderboardEntry> — Nitro has no generics. */
export interface LeaderboardEntryPage {
  items: LeaderboardEntry[];
  nextPageToken?: string;
  totalCount: number;
}

export interface GetEntriesOptions {
  filter?: LeaderboardFilter;
  startAt?: LeaderboardStartAt;
  pageSize?: number;
  pageToken?: string;
}

export interface WriteScoreOptions {
  extraData?: string;
  supplementaryMetric?: number;
  forceUpdate?: boolean;
}

export interface WriteScoreResult {
  apiName: string;
  didUpdate: boolean;
  previousScore?: number;
  newScore: number;
  newRank?: number;
}

export interface PicoLeaderboards extends HybridObject<{ android: 'kotlin' }> {
  readonly available: boolean;
  readonly sdkVersion: string;

  getAllLeaderboards(): Promise<Leaderboard[]>;
  getEntries(apiName: string, options?: GetEntriesOptions): Promise<LeaderboardEntryPage>;
  getEntriesAfterRank(
    apiName: string,
    afterRank: number,
    options?: GetEntriesOptions
  ): Promise<LeaderboardEntryPage>;
  /** Emulated by scanning entries — PPS has no direct single-user lookup. */
  getUserEntry(apiName: string): Promise<LeaderboardEntry | undefined>;
  writeScore(
    apiName: string,
    score: number,
    options?: WriteScoreOptions
  ): Promise<WriteScoreResult>;
}
