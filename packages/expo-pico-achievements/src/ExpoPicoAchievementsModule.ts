import { NativeModule } from 'expo';
import { resolveNativeModule } from '@expo-pico/platform-service-common';

declare class ExpoPicoAchievementsModule extends NativeModule {
  readonly achievementsSdkAvailable: boolean;
  readonly achievementsSdkVersion: string;

  getAllAchievements(): Promise<Record<string, unknown>[]>;
  getAchievementProgress(apiNames: string[]): Promise<Record<string, unknown>[]>;
  unlockAchievement(apiName: string): Promise<Record<string, unknown>>;
  addAchievementCount(apiName: string, count: number): Promise<Record<string, unknown>>;
  addAchievementBitfield(apiName: string, bits: string): Promise<Record<string, unknown>>;
}

const { available, nativeModule } = resolveNativeModule<ExpoPicoAchievementsModule>('ExpoPicoAchievements');

export const NativeAchievements = available ? nativeModule : null;
export const achievementsNativeAvailable = available;
