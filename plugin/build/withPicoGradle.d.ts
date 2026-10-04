import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Render the `productFlavors { ... }` block injected into `app/build.gradle`.
 *
 * Extracted from the plugin so unit tests can verify the string shape
 * (ABI filter presence, dual-flavor suffix, SDK version interpolation)
 * without spinning up the full @expo/config-plugins mod pipeline.
 *
 * The `pico` (and `dual`) flavors get `ndk { abiFilters 'arm64-v8a' }`
 * when `options.ndkAbiFilters` is true. PICO 4 / 4 Ultra / Swan are all
 * 64-bit ARM. Renderer-agnostic — same filter whether the app renders
 * with `@reactvision/react-viro`, Unity-as-a-Library, or any other
 * Android-side renderer.
 *
 * The `mobile` flavor is deliberately never ABI-filtered so phone /
 * tablet builds keep whatever abiFilters the consuming app already set.
 */
export declare function renderFlavorBlock(options: ResolvedPicoOptions): string;
/** Keep overrides out of Quest/mobile variants and remove our old global rule. */
export declare function updateOverlayPackaging(contents: string, options: ResolvedPicoOptions): string;
export declare const withPicoAppBuildGradle: ConfigPlugin<ResolvedPicoOptions>;
export declare const withPicoProjectBuildGradle: ConfigPlugin<ResolvedPicoOptions>;
declare const _default: {
    withPicoAppBuildGradle: ConfigPlugin<ResolvedPicoOptions>;
    withPicoProjectBuildGradle: ConfigPlugin<ResolvedPicoOptions>;
};
export default _default;
//# sourceMappingURL=withPicoGradle.d.ts.map