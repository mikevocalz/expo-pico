import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoSpatialOptions } from './types';
/**
 * Injects `spatialToolsVersion` into the project-level build.gradle's
 * `buildscript { ext { } }` block. Required by the PICO Spatial Tools SDK
 * Gradle plugin at build time.
 *
 * If no `buildscript` block exists, one is prepended to the file.
 * If `buildscript` exists but has no `ext`, the ext block is inserted.
 * If both exist, the property is appended inside `ext`.
 */
export declare const withPicoSpatialProjectBuildGradle: ConfigPlugin<ResolvedPicoSpatialOptions>;
//# sourceMappingURL=withPicoSpatialGradle.d.ts.map