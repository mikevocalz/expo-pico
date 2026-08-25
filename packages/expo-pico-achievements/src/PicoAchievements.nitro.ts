import type { HybridObject } from 'react-native-nitro-modules';

export type AchievementType = 'simple' | 'count' | 'bitfield';
export type AchievementVisibility = 'always-visible' | 'hidden';

export interface Achievement {
  apiName: string;
  title: string;
  description: string;
  type: AchievementType;
  visibility: AchievementVisibility;
  /** 'count' type only: value required to unlock. */
  target?: number;
  /** 'bitfield' type only: total number of bits. */
  bitfieldLength?: number;
  iconUrl?: string;
  isUnlocked: boolean;
  unlockedAtMs?: number;
  progress: number;
}

export interface UnlockAchievementResult {
  apiName: string;
  justUnlocked: boolean;
  unlockedAtMs: number;
}

export interface AddCountResult {
  apiName: string;
  currentCount: number;
  targetCount: number;
  justUnlocked: boolean;
}

export interface AddBitfieldResult {
  apiName: string;
  currentBitsSet: number;
  totalBits: number;
  justUnlocked: boolean;
}

export interface AchievementUnlockedEvent {
  apiName: string;
  unlockedAtMs: number;
}

export interface PicoAchievements extends HybridObject<{ android: 'kotlin' }> {
  readonly available: boolean;
  readonly sdkVersion: string;

  getAllAchievements(): Promise<Achievement[]>;
  getUnlockedAchievements(): Promise<Achievement[]>;
  getAchievementProgress(apiNames: string[]): Promise<Achievement[]>;
  unlockAchievement(apiName: string): Promise<UnlockAchievementResult>;
  addAchievementCount(apiName: string, count: number): Promise<AddCountResult>;
  addAchievementBitfield(apiName: string, bitfield: string): Promise<AddBitfieldResult>;

  /** Returns a listener id for removeAchievementUnlockedListener. */
  addAchievementUnlockedListener(
    listener: (event: AchievementUnlockedEvent) => void
  ): number;
  removeAchievementUnlockedListener(id: number): void;
}
