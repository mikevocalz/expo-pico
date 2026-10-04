import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
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
export declare const withPicoNewArchCheck: ConfigPlugin<ResolvedPicoOptions>;
export default withPicoNewArchCheck;
//# sourceMappingURL=withPicoNewArchCheck.d.ts.map