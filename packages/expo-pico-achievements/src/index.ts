import {
  guardService,
  wrapNativeCall,
  safeAddListener,
  createNativeEventEmitter,
  type Subscription,
} from '@expo-pico/platform-service-common';
import { NativeAchievements } from './ExpoPicoAchievementsModule';
import type {
  Achievement,
  UnlockAchievementResult,
  AddCountResult,
  AddBitfieldResult,
  AchievementUnlockedEvent,
} from './types';

export * from './types';
export type { Subscription };

const PKG = 'expo-pico-achievements';

const emitter = createNativeEventEmitter(NativeAchievements);

// ─── Availability ─────────────────────────────────────────────────────────────

export function isAchievementsAvailable(): boolean {
  return NativeAchievements?.achievementsSdkAvailable ?? false;
}

export function getAchievementsSdkVersion(): string {
  return NativeAchievements?.achievementsSdkVersion ?? 'unavailable';
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllAchievements(): Promise<Achievement[]> {
  guardService(isAchievementsAvailable(), PKG, 'getAllAchievements');
  const raw = await wrapNativeCall(PKG, 'getAllAchievements', NativeAchievements!.getAllAchievements());
  return raw as unknown as Achievement[];
}

/**
 * Client-side filter over getAllAchievements() — not a separate SDK call.
 * Avoids a second round-trip for the common "show only unlocked" use case.
 */
export async function getUnlockedAchievements(): Promise<Achievement[]> {
  guardService(isAchievementsAvailable(), PKG, 'getUnlockedAchievements');
  const all = await getAllAchievements();
  return all.filter((a) => a.isUnlocked);
}

export async function getAchievementProgress(apiNames: string[]): Promise<Achievement[]> {
  guardService(isAchievementsAvailable(), PKG, 'getAchievementProgress');
  const raw = await wrapNativeCall(
    PKG, 'getAchievementProgress',
    NativeAchievements!.getAchievementProgress(apiNames)
  );
  return raw as unknown as Achievement[];
}

// ─── Reporting ────────────────────────────────────────────────────────────────

export async function unlockAchievement(apiName: string): Promise<UnlockAchievementResult> {
  guardService(isAchievementsAvailable(), PKG, 'unlockAchievement');
  const raw = await wrapNativeCall(
    PKG, 'unlockAchievement',
    NativeAchievements!.unlockAchievement(apiName)
  );
  return raw as unknown as UnlockAchievementResult;
}

export async function addAchievementCount(
  apiName: string,
  count: number
): Promise<AddCountResult> {
  guardService(isAchievementsAvailable(), PKG, 'addAchievementCount');
  const raw = await wrapNativeCall(
    PKG, 'addAchievementCount',
    NativeAchievements!.addAchievementCount(apiName, count)
  );
  return raw as unknown as AddCountResult;
}

export async function addAchievementBitfield(
  apiName: string,
  bits: string
): Promise<AddBitfieldResult> {
  guardService(isAchievementsAvailable(), PKG, 'addAchievementBitfield');
  const raw = await wrapNativeCall(
    PKG, 'addAchievementBitfield',
    NativeAchievements!.addAchievementBitfield(apiName, bits)
  );
  return raw as unknown as AddBitfieldResult;
}

// ─── Event listeners ──────────────────────────────────────────────────────────

export function addAchievementUnlockedListener(
  listener: (event: AchievementUnlockedEvent) => void
): Subscription {
  return safeAddListener<AchievementUnlockedEvent>(emitter, 'onAchievementUnlocked', listener);
}
