import { requireOptionalNativeModule } from 'expo';

import type { PicoRuntimeInfo, PicoXRMode } from '@expo-pico/core';

/**
 * Build-time platform for the example's 2D and immersive surfaces.
 *
 * `isHorizonBuild` comes from expo-horizon-core's `ExpoHorizon` module, which
 * reports `true` only in the `quest` flavor. Read through
 * `requireOptionalNativeModule` rather than the package's default export: the
 * default export calls `requireNativeModule` at import time and throws on any
 * target that does not link the module (iOS, web, a JS-only test run).
 */
type HorizonModule = { isHorizonBuild?: boolean; horizonAppId?: string | null };

const horizon = requireOptionalNativeModule<HorizonModule>('ExpoHorizon');

/** True in the Meta Horizon OS (`quest`) flavor: Quest 3/3S and Meta VR Glasses. */
export const isHorizonBuild: boolean = horizon?.isHorizonBuild ?? false;

/** Meta Horizon Store app ID from the expo-horizon-core plugin, if one is set. */
export const horizonAppId: string | null = horizon?.horizonAppId || null;

/**
 * True on any headset build. The `quest` flavor reports `xrMode: 'quest'` from
 * @expo-pico/core; `isHorizonBuild` covers an older core build that still
 * reported the PICO mode there.
 */
export function isHeadsetBuild(info: Pick<PicoRuntimeInfo, 'xrMode'>): boolean {
  return isHorizonBuild || info.xrMode !== 'mobile';
}

/** Runtime name for chips and badges. PICO and phone builds keep the raw mode. */
export function xrModeLabel(mode: PicoXRMode): string {
  return isHorizonBuild || mode === 'quest' ? 'Horizon OS' : mode;
}
