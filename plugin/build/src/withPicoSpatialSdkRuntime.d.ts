import { ConfigPlugin } from '@expo/config-plugins';
export declare const SPATIAL_SDK_VERSION = "6.2.8";
/**
 * Gradle appended to app/build.gradle when `enableSpatialSdk` is true.
 *
 * Only `core` is declared; its POM brings `foundation` at the same version.
 * It goes on the pico and dual flavor configurations, whichever exist, so the
 * mobile and quest APKs never carry it. The repo filter covers just the two
 * Spatial groups, because the project-level Volcengine repo that
 * expo-pico-core registers is filtered to com.pico.pps and com.pico.
 */
export declare function renderSpatialSdkRuntimeBlock(version?: string): string;
/**
 * Appends the runtime block to app/build.gradle, or moves an existing block
 * to `version`. A block written by an earlier release keeps its marker, so
 * without the rewrite an android/ tree that is not prebuilt with --clean
 * would stay on the old SDK.
 */
export declare function applySpatialSdkRuntimeBlock(contents: string, version?: string): string;
export declare const withPicoSpatialSdkRuntime: ConfigPlugin;
//# sourceMappingURL=withPicoSpatialSdkRuntime.d.ts.map