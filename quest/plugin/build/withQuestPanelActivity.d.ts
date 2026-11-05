import { AndroidConfig, ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedQuestOptions } from './types';
type Manifest = AndroidConfig.Manifest.AndroidManifest;
type Node = {
    $?: Record<string, string | undefined>;
    [key: string]: any;
};
/**
 * @expo-pico/core's panel activity: a second surface on the app's one
 * ReactHost, opened with `PicoWindows.createPanelHost().openPanel(...)`.
 */
export declare const PANEL_ACTIVITY = "expo.modules.pico.PicoPanelActivity";
/** Meta's panel width range for a second activity panel (panel-sizing docs). */
export declare const PANEL_WIDTH_RANGE_DP: {
    readonly min: 384;
    readonly max: 1440;
};
/** The detail panel's size, as `"<n>dp"` strings. */
export interface QuestDetailPanelOptions {
    defaultWidth: string;
    defaultHeight: string;
}
/**
 * Validates `detailPanel`. Returns null when it is unset or false.
 *
 * @throws When a size is not a dp string or the width is outside Meta's range.
 */
export declare function normalizeDetailPanel(value: QuestDetailPanelOptions | false | null | undefined): QuestDetailPanelOptions | null;
/** The quest-manifest `<activity>` for the panel. Pure. */
export declare function panelActivityElement(size: QuestDetailPanelOptions): Node;
/**
 * Adds, replaces (size set) or removes (null) the panel activity in a parsed
 * quest manifest. Returns true when the manifest changed.
 */
export declare function applyQuestPanelActivity(manifest: Manifest, size: QuestDetailPanelOptions | null): boolean;
/** Brings app/src/quest/AndroidManifest.xml in line with `detailPanel`. */
export declare function syncQuestPanelActivity(platformRoot: string, options: ResolvedQuestOptions): Promise<void>;
/**
 * Declares @expo-pico/core's panel activity in the quest flavor, sized by
 * `<layout>`, so `PicoWindows.isPanelAvailable` is true there and a detail
 * panel opens beside the main panel (Meta's multi-panel activity launch).
 *
 * A finalized mod because expo-horizon-core rewrites the quest manifest in a
 * dangerous mod.
 */
export declare const withQuestPanelActivity: ConfigPlugin<ResolvedQuestOptions>;
export {};
//# sourceMappingURL=withQuestPanelActivity.d.ts.map