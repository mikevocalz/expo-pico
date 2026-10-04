import { ConfigPlugin } from '@expo/config-plugins';
export declare const SPATIAL_SDK_VERSION = "6.1.9";
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
export declare const withPicoSpatialSdkRuntime: ConfigPlugin;
//# sourceMappingURL=withPicoSpatialSdkRuntime.d.ts.map