import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Compatibility overlays for older AARs. The native ViroCore renderer remains
 * authoritative; modern paired AAR builds can disable both overlays. ELF page
 * alignment must be checked in the resulting artifact, independent of OS name.
 * Record hashes so incremental prebuild updates and removals preserve user files.
 */
export declare function syncPicoOverlays(platformRoot: string, options: ResolvedPicoOptions, stagedRoot?: string): void;
export declare const withPicoOpenXrLoaderOverlay: ConfigPlugin<ResolvedPicoOptions>;
//# sourceMappingURL=withPicoOpenXrLoaderOverlay.d.ts.map