import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Composite plugin that applies all Swan-only mutations:
 *
 *   1. Optionally injects a Swan SDK Maven artifact and/or a Swan runtime
 *      Gradle subproject implementation into `app/build.gradle`. Both are
 *      idempotent (marker-guarded) and replaced in place when toggled.
 *   2. Optionally scaffolds a `picoSwan` Kotlin source set with a single
 *      `PicoSwanBootstrap.kt` extension seam, useful for app-level Swan-
 *      only initialization without polluting the shared `pico` flavor.
 *
 * No-op when `xrMode !== 'pico-swan'`. The Swan composite intentionally
 * does NOT touch:
 *   - MainApplication (handled by withPicoMainApplication for both
 *     'pico-os5' and 'pico-swan'),
 *   - settings.gradle (handled by withPicoSettingsGradle),
 *   - Manifest meta-data (handled by withPicoAndroidManifest, which reads
 *     options.xrMode and options.picoSwan to decide what to write).
 *
 * This separation keeps each concern in a single place and makes it easy
 * to delete Swan support later without unwinding cross-cutting hooks.
 */
export declare const withPicoSwan: ConfigPlugin<ResolvedPicoOptions>;
/**
 * Pure transform that writes Swan-only Gradle dependency block into
 * `app/build.gradle`. Exposed for unit testing.
 *
 * Always re-emits the block on each run so toggling swanSdkArtifact /
 * swanRuntimeProject between prebuilds doesn't accumulate stale lines.
 * Returns the source unchanged when there is no Swan content to write.
 */
export declare function applySwanGradleTransform(source: string, options: ResolvedPicoOptions): string;
export default withPicoSwan;
//# sourceMappingURL=withPicoSwan.d.ts.map