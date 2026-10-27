import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
export declare const PICO_NITRO_INCLUDE_MARKER = "// expo-pico-core: @expo-pico/* Nitro module inclusion";
export declare const PICO_NITRO_DEPS_MARKER = "// expo-pico-core: @expo-pico/* module dependencies";
/**
 * Every package in the family that ships an Android Gradle module.
 *
 * `@expo-pico/app-kit` is absent deliberately — it is TypeScript only. Kept
 * in step with `NITRO_ONLOAD_CLASSES` in `android/src/nitro/PicoCorePackage.kt`.
 */
export declare const PICO_NATIVE_PACKAGES: readonly string[];
/**
 * Removes the `include` block this plugin used to append to settings.gradle.
 *
 * The block starts at {@link PICO_NITRO_INCLUDE_MARKER}, continues through its
 * comment lines, and ends after the last `include ':expo-pico-*'` /
 * `project(':expo-pico-*').projectDir` line. Returns the input unchanged when
 * the marker is absent.
 */
export declare function stripIncludeBlock(contents: string): string;
/**
 * Removes the `dependencies { implementation project(':expo-pico-*') }` block
 * this plugin used to append to app/build.gradle. Returns the input unchanged
 * when the marker is absent.
 */
export declare function stripDependencyBlock(contents: string): string;
/**
 * Removes what earlier versions of this plugin wrote to the Gradle files.
 *
 * Those versions included every installed `@expo-pico/*` Android module in
 * settings.gradle as `:expo-pico-<name>` and added it to the app's
 * dependencies, because the packages had no autolinking entry. Each package
 * now ships a `react-native.config.js` and a `ReactPackage`, so React Native
 * autolinking includes it (as `:expo-pico_<name>`) whether or not this plugin
 * is configured. A leftover block from a prebuild without `--clean` would
 * include the same directory a second time under the old name, and Gradle
 * would compile the module twice into one APK.
 */
export declare const withPicoNitroModules: ConfigPlugin<ResolvedPicoOptions>;
export default withPicoNitroModules;
//# sourceMappingURL=withPicoNitroModules.d.ts.map