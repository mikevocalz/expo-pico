import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Optionally injects PICO Swan runtime subproject inclusion into
 * `android/settings.gradle`.
 *
 * Mirrors the role of Viro's `withViroSettingsGradle` (which appends
 * `include ':react_viro', ':arcore_client', ':gvr_common', ':viro_renderer'`
 * unconditionally). Two changes:
 *
 *   1. **Idempotent.** Marker-guarded; re-running prebuild does not produce
 *      duplicate `include` lines (Viro's helper does — that's a known bug
 *      we explicitly correct here).
 *   2. **Opt-in, not unconditional.** PICO Swan SDK is not a vendored set of
 *      Gradle subprojects shipped inside this package. Inclusion only
 *      happens when the consumer points the plugin at a Swan runtime
 *      subproject path via `picoSwan.swanRuntimeProject`. This is the
 *      extension seam for when public PICO Swan native libraries ship as
 *      Gradle modules.
 *
 * No-ops when:
 *   - `xrMode !== 'pico-swan'`, OR
 *   - `picoSwan.swanRuntimeProject` is unset.
 */
export declare const withPicoSettingsGradle: ConfigPlugin<ResolvedPicoOptions>;
/**
 * Pure string transform exposed for unit testing without spinning up the
 * full @expo/config-plugins mod pipeline. Returns the source unchanged when
 * Swan inclusion is not active.
 */
export declare function applySettingsGradleTransform(source: string, options: ResolvedPicoOptions): string;
export declare function applyViroPathRewrite(source: string): string;
export default withPicoSettingsGradle;
//# sourceMappingURL=withPicoSettingsGradle.d.ts.map