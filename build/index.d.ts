import { type GetEntriesOptions, type WriteScoreOptions } from './PicoLeaderboards.nitro';
export type { Leaderboard, LeaderboardEntry, LeaderboardEntryPage, LeaderboardSortOrder, LeaderboardFilter, LeaderboardStartAt, GetEntriesOptions, WriteScoreOptions, WriteScoreResult, } from './types';
export declare function isLeaderboardsAvailable(): boolean;
export declare function getLeaderboardsSdkVersion(): string;
export declare function getAllLeaderboards(): Promise<import("./PicoLeaderboards.nitro").Leaderboard[]>;
export declare function getEntries(apiName: string, options?: GetEntriesOptions): Promise<import("./PicoLeaderboards.nitro").LeaderboardEntryPage>;
export declare function getEntriesAfterRank(apiName: string, afterRank: number, options?: GetEntriesOptions): Promise<import("./PicoLeaderboards.nitro").LeaderboardEntryPage>;
/** The viewer's row on the global board, or undefined if they have no score. */
export declare function getUserEntry(apiName: string): Promise<import("./PicoLeaderboards.nitro").LeaderboardEntry | undefined>;
export declare function writeScore(apiName: string, score: number, options?: WriteScoreOptions): Promise<import("./PicoLeaderboards.nitro").WriteScoreResult>;
//# sourceMappingURL=index.d.ts.map