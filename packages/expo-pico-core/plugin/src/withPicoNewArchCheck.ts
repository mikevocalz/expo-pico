import { ConfigPlugin, WarningAggregator } from '@expo/config-plugins';

import type { ResolvedPicoOptions } from './types';

const TAG = '@expo-pico/core';

/**
 * Soft-checks that the consuming app has the New Architecture enabled.
 *
 * Mirrors Viro's behavior — warns but never throws — because:
 *   1. PICO OS 6 native modules link against Fabric/Turbo Modules; the
 *      runtime detection module itself works under Legacy Architecture but
 *      `xrMode: 'pico-swan'` registration depends on the New Arch package
 *      registration shape that ships with RN ≥ 0.74.
 *   2. Throwing inside a config plugin terminates `npx expo prebuild` with a
 *      stack trace that is usually less useful than a clear warning that
 *      points the user at the right setting.
 *
 * Looks for either:
 *   - top-level `newArchEnabled: true`, or
 *   - `expo.newArchEnabled === true`.
 *
 * No-op when `xrMode === 'mobile'`.
 */
export const withPicoNewArchCheck: ConfigPlugin<ResolvedPicoOptions> = (
  config,
  options
) => {
  if (options.xrMode === 'mobile') return config;

  const newArchEnabled =
    (config as unknown as { newArchEnabled?: boolean }).newArchEnabled === true ||
    (config as unknown as { expo?: { newArchEnabled?: boolean } }).expo?.newArchEnabled === true;

  if (!newArchEnabled) {
    WarningAggregator.addWarningAndroid(
      TAG,
      `xrMode '${options.xrMode}' expects newArchEnabled: true. ` +
        'PicoCorePackage relies on the New Architecture package registration shape. ' +
        "Set 'newArchEnabled: true' in app.config.{ts,js,json} (top-level)."
    );
  }

  return config;
};

export default withPicoNewArchCheck;
