import { Android, type HybridObject } from 'react-native-nitro-modules';

export type LeaderboardSortOrder = 'descending' | 'ascending';
/**
 * `'viewer-and-friends'` is not supported on PICO: the Platform SDK has no such filter
 * (`ppfLeaderboardFilterType` offers only None, Friends and UserIds), so `getEntries`
 * rejects it with an `UNSUPPORTED_FILTER` error.
 */
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
  /** Defaults to `'none'` (global board). */
  filter?: LeaderboardFilter;
  /** Defaults to `'centered-on-viewer'`. */
  startAt?: LeaderboardStartAt;
  /** Defaults to 20. */
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

// Android only: PICO OS is Android. On other platforms `new PicoLeaderboards()` throws,
// and the package's resolver turns that into its native-absent default.
@Android({ language: 'kotlin', implementation: { className: 'HybridPicoLeaderboards' } })
export declare class PicoLeaderboards extends HybridObject {
  constructor();

  readonly available: boolean;
  readonly sdkVersion: string;

  getAllLeaderboards(): Promise<Leaderboard[]>;
  getEntries(apiName: string, options?: GetEntriesOptions): Promise<LeaderboardEntryPage>;
  getEntriesAfterRank(
    apiName: string,
    afterRank: number,
    options?: GetEntriesOptions
  ): Promise<LeaderboardEntryPage>;
  /** The viewer's row on the global board, or undefined if they have no score. */
  getUserEntry(apiName: string): Promise<LeaderboardEntry | undefined>;
  writeScore(
    apiName: string,
    score: number,
    options?: WriteScoreOptions
  ): Promise<WriteScoreResult>;
}

export * from '#nitro/PicoLeaderboards';
