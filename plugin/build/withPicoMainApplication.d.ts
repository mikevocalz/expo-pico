import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * MainApplication edits for PICO builds (`xrMode` other than `'mobile'`) and for
 * any build that has react-viro's `VRActivity` (`usesViroVrActivity`):
 *
 *   - Adds the New Architecture flag guard for the Viro VR activity hop
 *     (Kotlin only; see `injectNewArchFlagGuard`).
 *   - Strips the `PicoCorePackage` registration older prebuilds injected.
 *     React Native autolinking registers it (see react-native.config.js).
 *   - Installs `ImmersiveActivityTracker` from `Application.onCreate` (see
 *     `injectTrackerInstall`).
 */
export declare const withPicoMainApplication: ConfigPlugin<ResolvedPicoOptions>;
export declare function injectIntoKotlinMainApplication(source: string, _options: ResolvedPicoOptions): string | null;
type PluginConfig = {
    plugins?: unknown[];
    _internal?: {
        [k: string]: unknown;
    };
};
/**
 * True when `@reactvision/react-viro` is a config plugin, which generates the
 * immersive `VRActivity` that shares the app's ReactHost. A quest-only app
 * (no `picoAppId`, so `xrMode` stays `'mobile'`) has that activity too and
 * needs the flag guard: without it, entering XR on a Quest 3S crashed with
 * `AssertionError: Pausing an activity that is not the current activity ...
 * Current activity: VRActivity Paused activity: MainActivity`.
 *
 * Matches the package name, a subpath of it, a relative or absolute path into
 * the package, and the plugin function itself.
 */
export declare function usesViroVrActivity(config: PluginConfig): boolean;
export declare function injectIntoJavaMainApplication(source: string, _options: ResolvedPicoOptions): string | null;
export default withPicoMainApplication;
//# sourceMappingURL=withPicoMainApplication.d.ts.map