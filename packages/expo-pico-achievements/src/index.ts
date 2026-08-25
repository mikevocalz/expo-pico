import {
  guardService,
  wrapNativeCall,
  resolveHybridObject,
  NULL_SUBSCRIPTION,
  type Subscription,
} from '@expo-pico/platform-service-common';
import type { PicoAchievements, AchievementUnlockedEvent } from './PicoAchievements.nitro';

export type {
  Achievement,
  AchievementType,
  AchievementVisibility,
  AchievementUnlockedEvent,
  UnlockAchievementResult,
  AddCountResult,
  AddBitfieldResult,
} from './PicoAchievements.nitro';

const PKG = '@expo-pico/achievements';

function native(): PicoAchievements | null {
  return resolveHybridObject<PicoAchievements>('PicoAchievements');
}

export function isAchievementsAvailable(): boolean {
  return native()?.available ?? false;
}

export function getAchievementsSdkVersion(): string {
  return native()?.sdkVersion ?? 'unavailable';
}

export async function getAllAchievements() {
  guardService(isAchievementsAvailable(), PKG, 'getAllAchievements');
  return wrapNativeCall(PKG, 'getAllAchievements', native()!.getAllAchievements());
}

export async function getUnlockedAchievements() {
  guardService(isAchievementsAvailable(), PKG, 'getUnlockedAchievements');
  return wrapNativeCall(PKG, 'getUnlockedAchievements', native()!.getUnlockedAchievements());
}

export async function getAchievementProgress(apiNames: string[]) {
  guardService(isAchievementsAvailable(), PKG, 'getAchievementProgress');
  return wrapNativeCall(PKG, 'getAchievementProgress', native()!.getAchievementProgress(apiNames));
}

export async function unlockAchievement(apiName: string) {
  guardService(isAchievementsAvailable(), PKG, 'unlockAchievement');
  return wrapNativeCall(PKG, 'unlockAchievement', native()!.unlockAchievement(apiName));
}

export async function addAchievementCount(apiName: string, count: number) {
  guardService(isAchievementsAvailable(), PKG, 'addAchievementCount');
  return wrapNativeCall(PKG, 'addAchievementCount', native()!.addAchievementCount(apiName, count));
}

export async function addAchievementBitfield(apiName: string, bits: string) {
  guardService(isAchievementsAvailable(), PKG, 'addAchievementBitfield');
  return wrapNativeCall(
    PKG,
    'addAchievementBitfield',
    native()!.addAchievementBitfield(apiName, bits)
  );
}

/**
 * Nitro listeners are id-based; the Subscription shape is preserved here so the
 * public API is unchanged from the Expo Modules version.
 */
export function addAchievementUnlockedListener(
  listener: (event: AchievementUnlockedEvent) => void
): Subscription {
  const hybrid = native();
  if (!hybrid?.available) return NULL_SUBSCRIPTION;
  const id = hybrid.addAchievementUnlockedListener(listener);
  return { remove: () => hybrid.removeAchievementUnlockedListener(id) };
}
