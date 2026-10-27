import { AndroidConfig } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * PICO OS 5 window rules, as read from framework.jar and services.jar on a
 * PICO 4 Ultra (OS 5.15.7):
 *
 * - Activities of one package share a 2D window when their
 *   `pico.vr.position` meta-data match. An activity without the key counts
 *   as "far". A second activity with the main window's value replaces the
 *   main window instead of opening beside it.
 * - "near" maps to window type 2002, a popup PICO hides on any click
 *   outside it.
 * - A third-party window takes its size only from the launch's
 *   ActivityOptions, never from `<layout>`.
 */
export declare const VR_POSITION_META = "pico.vr.position";
export declare const IMPLICIT_POSITION = "far";
export declare const POPUP_POSITION = "near";
/**
 * The panel activity's position. Any value PICO OS 5 does not map to a
 * window type gives the activity a window of its own with the main window's
 * type; "rail" is the value checked on a PICO 4 Ultra.
 */
export declare const PANEL_POSITION = "rail";
export declare const PANEL_ACTIVITY = "expo.modules.pico.PicoPanelActivity";
/**
 * Application meta-data the main-window listener reads. Written to the PICO
 * flavor manifest only, so it is absent from every other build.
 */
export declare const TRANSLUCENT_MAIN_WINDOW_META = "expo.modules.pico.TRANSLUCENT_MAIN_WINDOW";
type Manifest = AndroidConfig.Manifest.AndroidManifest;
/**
 * Writes the window defaults into the PICO flavor manifest: the
 * translucent-main-window flag and the panel activity, each removed again
 * when its option is off. Idempotent.
 */
export declare function applyWindowContract(manifest: Manifest, options: ResolvedPicoOptions): void;
interface ActivityWindow {
    name: string;
    /** Undefined when the activity leaves `pico.vr.position` unset. */
    explicitPosition: string | undefined;
    immersive: boolean;
}
/**
 * Each activity's window facts for the main manifest merged with one flavor
 * manifest. A flavor entry for the same activity overrides main's meta-data
 * values; `tools:node="remove"` drops the activity.
 */
export declare function activityWindows(main: Manifest, flavor?: Manifest): ActivityWindow[];
/**
 * Problems with the activities' `pico.vr.position` values. The Gradle check
 * in android/pico-window-positions.gradle applies the same rules to each
 * variant's merged manifest.
 *
 * - An activity that sets "near" gets a popup window.
 * - An activity that sets a position shares the window of every other
 *   activity with the same position, the implicit "far" included.
 *
 * Activities that leave the key unset all share "far" and are not reported
 * against each other: that is how an ordinary Android app replaces its one
 * window. Immersive activities (`pvr.app.type=vr`) are skipped, because
 * PICO gives them the whole display, not a 2D window.
 */
export declare function windowPositionProblems(windows: ActivityWindow[]): string[];
export declare function windowPositionError(where: string, problems: string[]): Error;
/** Throws when main (optionally merged with flavor) breaks a position rule. */
export declare function assertWindowPositions(where: string, main: Manifest, flavor?: Manifest): void;
/**
 * Checks app/src/main alone and with each app/src/<flavor> manifest on
 * disk. Library manifests are checked by the Gradle task, which reads the
 * merged result.
 */
export declare function assertWindowPositionsOnDisk(platformProjectRoot: string): Promise<void>;
export {};
//# sourceMappingURL=picoWindows.d.ts.map