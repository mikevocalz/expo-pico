import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Injects PICO-related properties into gradle.properties.
 *
 * Uses withGradleProperties — the safe, structured mod for gradle.properties.
 * Properties are appended; duplicates are avoided by checking existing entries.
 *
 * Properties injected:
 *   - picoAppId: Read by the library's android/build.gradle to set BuildConfig fields
 *   - picoSpatialMode: Available to native code via gradle property
 *   - picoTargetProfile / picoContainerMode / picoEmulatorOptimizations:
 *     keep the library BuildConfig aligned with the app BuildConfig fields
 *   - picoBuildEnabled: Signals to sibling packages that PICO build infra is active
 */
export declare const withPicoGradleProperties: ConfigPlugin<ResolvedPicoOptions>;
export default withPicoGradleProperties;
//# sourceMappingURL=withPicoGradleProperties.d.ts.map