import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Compatibility overlays for older AARs. The native ViroCore renderer remains
 * authoritative; modern paired AAR builds can disable both overlays. ELF page
 * alignment must be checked in the resulting artifact, independent of OS name.
 * Record hashes so incremental prebuild updates and removals preserve user files.
 *
 * The two overlays go to different flavors:
 * - `libopenxr_loader.so` goes to pico (and dual) only. It is the generic
 *   Khronos loader, but stock Viro 3.0.2 already ships a 16KB-aligned loader
 *   that exports every `xr*` symbol the overlay renderer imports, so Quest has
 *   no reason to swap it.
 * - `libviro_renderer.so` and the assets it loads (`controller_neutral.glb`)
 *   replace Viro's OpenXR renderer for every headset, and the floor origin and
 *   controller mesh apply on Quest as well. They go to pico, dual and quest. Core
 *   declares the `quest` flavor itself whenever these overlays can be active
 *   (`buildVariant` `pico` or `dual`; see `renderFlavorBlock`), so
 *   `app/src/quest` is always a real source set here. Without it, Quest builds
 *   get the stock renderer: floor at eye level and no controller models.
 *
 * `main` and `mobile` never get either. This function writes only files under
 * `jniLibs/` and `assets/`. The quest manifest's RENDER_MODEL entries, which
 * the renderer needs for Meta's runtime controller models, are handled by
 * `withQuestRenderModel` under the same condition.
 */
export declare function syncPicoOverlays(platformRoot: string, options: ResolvedPicoOptions, stagedRoot?: string): void;
export declare const withPicoOpenXrLoaderOverlay: ConfigPlugin<ResolvedPicoOptions>;
//# sourceMappingURL=withPicoOpenXrLoaderOverlay.d.ts.map