import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * MainApplication edits for PICO builds (`xrMode` other than `'mobile'`):
 *
 *   - Adds the New Architecture flag guard for the Viro VR activity hop
 *     (Kotlin only; see `injectNewArchFlagGuard`).
 *   - Strips the `PicoCorePackage` registration older prebuilds injected.
 *     Core is an autolinked Expo Module, so it needs no manual registration.
 */
export declare const withPicoMainApplication: ConfigPlugin<ResolvedPicoOptions>;
export declare function injectIntoKotlinMainApplication(source: string, _options: ResolvedPicoOptions): string | null;
export declare function injectIntoJavaMainApplication(source: string, _options: ResolvedPicoOptions): string | null;
export default withPicoMainApplication;
//# sourceMappingURL=withPicoMainApplication.d.ts.map