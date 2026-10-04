import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Patches android/local.properties to ensure:
 *   1. `nodejs.dir` is set so Android Studio (which may launch outside a shell
 *      where nvm shims are unavailable) can resolve the `node` binary used
 *      during the React Native bundler invocation.
 *   2. `pico.sdk.dir` / `pico.editor.dir` are written when provided via env
 *      vars (PICO_SDK_DIR, PICO_EDITOR_DIR), mirroring the convention that
 *      Android Studio uses for `sdk.dir`.
 *
 * local.properties is intentionally NOT committed to source control, so
 * mutations here are safe to apply unconditionally on each prebuild.
 */
export declare const withPicoLocalProperties: ConfigPlugin<ResolvedPicoOptions>;
export default withPicoLocalProperties;
//# sourceMappingURL=withPicoLocalProperties.d.ts.map