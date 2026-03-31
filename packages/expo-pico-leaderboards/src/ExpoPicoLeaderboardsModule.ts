import { NativeModule } from 'expo';
import { resolveNativeModule } from '@expo-pico/platform-service-common';

declare class ExpoPicoLeaderboardsModule extends NativeModule {
  readonly leaderboardsSdkAvailable: boolean;
  readonly leaderboardsSdkVersion: string;

  getAllLeaderboards(): Promise<Record<string, unknown>[]>;
  writeScore(
    apiName: string,
    score: number,
    extraData: string | null,
    supplementaryMetric: number | null,
    forceUpdate: boolean
  ): Promise<Record<string, unknown>>;
  getEntries(
    apiName: string,
    filter: string,
    startAt: string,
    pageSize: number,
    pageToken: string | null
  ): Promise<Record<string, unknown>>;
  getEntriesAfterRank(
    apiName: string,
    afterRank: number,
    pageSize: number,
    pageToken: string | null
  ): Promise<Record<string, unknown>>;
  getUserEntry(apiName: string): Promise<Record<string, unknown> | null>;
}

const { available, nativeModule } = resolveNativeModule<ExpoPicoLeaderboardsModule>('ExpoPicoLeaderboards');

export const NativeLeaderboards = available ? nativeModule : null;
export const leaderboardsNativeAvailable = available;
