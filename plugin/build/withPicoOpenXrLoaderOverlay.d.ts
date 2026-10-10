import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Compatibility overlays for older AARs. The native ViroCore renderer remains
 * authoritative; modern paired AAR builds can disable both overlays. ELF page
 * alignment must be checked in the resulting artifact, independent of OS name.
 * Record hashes so incremental prebuild updates and removals preserve user files.
 *
 * Both overlays go to the pico (and dual) flavor only:
 * - `libopenxr_loader.so` is the generic Khronos loader.
 * - `libviro_renderer.so` and the assets it loads (`controller_neutral.glb`)
 *   replace Viro's OpenXR renderer: floor-level origin and controller meshes.
 *
 * The quest copy of the renderer, and the RENDER_MODEL manifest entries it
 * needs on Meta Horizon, are set on the expo-horizon-core plugin entry.
 * `main`, `mobile` and `quest` never get anything from here. This function
 * writes only files under `jniLibs/` and `assets/`.
 */
export declare function syncPicoOverlays(platformRoot: string, options: ResolvedPicoOptions, stagedRoot?: string): void;
export declare const withPicoOpenXrLoaderOverlay: ConfigPlugin<ResolvedPicoOptions>;
//# sourceMappingURL=withPicoOpenXrLoaderOverlay.d.ts.map