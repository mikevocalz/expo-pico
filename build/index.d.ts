import type { GetEntriesOptions, WriteScoreOptions } from './types';
export type { Leaderboard, LeaderboardEntry, LeaderboardEntryPage, LeaderboardSortOrder, LeaderboardFilter, LeaderboardStartAt, GetEntriesOptions, WriteScoreOptions, WriteScoreResult, } from './types';
export declare function isLeaderboardsAvailable(): boolean;
export declare function getLeaderboardsSdkVersion(): string;
export declare function getAllLeaderboards(): Promise<import("./types").Leaderboard[]>;
export declare function getEntries(apiName: string, options?: GetEntriesOptions): Promise<import("./types").LeaderboardEntryPage>;
export declare function getEntriesAfterRank(apiName: string, afterRank: number, options?: GetEntriesOptions): Promise<import("./types").LeaderboardEntryPage>;
/** Emulated by scanning entries — PPS has no single-user lookup. */
export declare function getUserEntry(apiName: string): Promise<import("./types").LeaderboardEntry | undefined>;
export declare function writeScore(apiName: string, score: number, options?: WriteScoreOptions): Promise<import("./types").WriteScoreResult>;
//# sourceMappingURL=index.d.ts.map