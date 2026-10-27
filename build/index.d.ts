import { type Subscription } from '@expo-pico/platform-service-common';
import { type AchievementUnlockedEvent } from './PicoAchievements.nitro';
export type { Achievement, AchievementType, AchievementVisibility, AchievementUnlockedEvent, UnlockAchievementResult, AddCountResult, AddBitfieldResult, } from './types';
export declare function isAchievementsAvailable(): boolean;
export declare function getAchievementsSdkVersion(): string;
export declare function getAllAchievements(): Promise<import("./PicoAchievements.nitro").Achievement[]>;
export declare function getUnlockedAchievements(): Promise<import("./PicoAchievements.nitro").Achievement[]>;
export declare function getAchievementProgress(apiNames: string[]): Promise<import("./PicoAchievements.nitro").Achievement[]>;
export declare function unlockAchievement(apiName: string): Promise<import("./PicoAchievements.nitro").UnlockAchievementResult>;
export declare function addAchievementCount(apiName: string, count: number): Promise<import("./PicoAchievements.nitro").AddCountResult>;
export declare function addAchievementBitfield(apiName: string, bits: string): Promise<import("./PicoAchievements.nitro").AddBitfieldResult>;
/**
 * Nitro listeners are id-based; the Subscription shape is preserved here so the
 * public API is unchanged from the Expo Modules version.
 */
export declare function addAchievementUnlockedListener(listener: (event: AchievementUnlockedEvent) => void): Subscription;
//# sourceMappingURL=index.d.ts.map