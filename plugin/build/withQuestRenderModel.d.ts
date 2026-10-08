import { AndroidConfig, ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
type Manifest = AndroidConfig.Manifest.AndroidManifest;
/** Meta permission that lets an app call `xrGetRenderModelPathsFB` / `xrLoadRenderModelFB`. */
export declare const RENDER_MODEL_PERMISSION = "com.oculus.permission.RENDER_MODEL";
/** Meta feature declared next to the permission; optional so the APK installs anywhere. */
export declare const RENDER_MODEL_FEATURE = "com.oculus.feature.RENDER_MODEL";
/**
 * True when `syncPicoOverlays` stages `libviro_renderer.so` into the quest
 * flavor. The RENDER_MODEL entries follow the same condition.
 */
export declare function rendererOverlayActive(options: ResolvedPicoOptions): boolean;
/**
 * Adds (enabled) or removes (disabled) the RENDER_MODEL permission and
 * feature in a quest flavor manifest. Every other entry is left alone.
 * Returns true when the manifest changed.
 */
export declare function applyQuestRenderModelEntries(manifest: Manifest, enabled: boolean): boolean;
/**
 * Brings `app/src/quest/AndroidManifest.xml` in line with the renderer
 * overlay. The file is created only when there is something to add; with the
 * overlay off an existing file loses the two entries and nothing else.
 */
export declare function syncQuestRenderModel(platformRoot: string, options: ResolvedPicoOptions): Promise<void>;
/**
 * Declares Meta's RENDER_MODEL permission and feature in the quest flavor
 * manifest while the renderer overlay is staged there. The overlay renderer
 * loads the runtime's own controller models through `XR_FB_render_model`,
 * which Horizon OS gates on this permission. PICO has no such extension, so
 * pico, dual, mobile and main never get either entry.
 *
 * Runs as a finalized mod: expo-horizon-core rewrites the quest manifest from
 * scratch in a dangerous mod, and dangerous mods registered later run
 * earlier, so a dangerous mod here could be overwritten.
 */
export declare const withQuestRenderModel: ConfigPlugin<ResolvedPicoOptions>;
export {};
//# sourceMappingURL=withQuestRenderModel.d.ts.map