export type AchievementType = 'simple' | 'count' | 'bitfield';

export type AchievementVisibility = 'always-visible' | 'hidden';

export interface Achievement {
  apiName: string;
  title: string;
  description: string;
  type: AchievementType;
  visibility: AchievementVisibility;
  /** count type: target value to unlock. null for simple/bitfield types */
  target: number | null;
  /** bitfield type: total number of bits. null for simple/count types */
  bitfieldLength: number | null;
  iconUrl: string | null;
  isUnlocked: boolean;
  unlockedAtMs: number | null;
  /** Current progress value: count for 'count' type, bits set for 'bitfield', 0 or 1 for 'simple' */
  progress: number;
}

export interface UnlockAchievementResult {
  apiName: string;
  /** True only if this call caused the unlock (false if already unlocked before) */
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

// ─── Event payloads ─────────────────────────────────────────────────────────

export interface AchievementUnlockedEvent {
  apiName: string;
  unlockedAtMs: number;
}
