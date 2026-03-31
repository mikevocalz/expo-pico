import type { PicoPage } from '@expo-pico/platform-service-common';

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
  /** Secondary metric, e.g. time in milliseconds. null if not configured. */
  supplementaryMetric: number | null;
  /** Up to 2048 bytes of caller-supplied extra data. null if not set. */
  extraData: string | null;
  userId: string;
  displayName: string;
  /** True when this entry belongs to the currently authenticated user */
  isCurrentUser: boolean;
  updatedAtMs: number;
}

export interface WriteScoreOptions {
  extraData?: string;
  supplementaryMetric?: number;
  /** Write even if score is lower than existing. Default: false */
  forceUpdate?: boolean;
}

export interface WriteScoreResult {
  apiName: string;
  /** True if this call changed the stored score */
  didUpdate: boolean;
  previousScore: number | null;
  newScore: number;
  newRank: number | null;
}

export interface GetEntriesOptions {
  filter?: LeaderboardFilter;
  startAt?: LeaderboardStartAt;
  pageSize?: number;
  pageToken?: string | null;
}

/** Paginated leaderboard entries — uses shared PicoPage<T> shape */
export type LeaderboardEntryPage = PicoPage<LeaderboardEntry>;
