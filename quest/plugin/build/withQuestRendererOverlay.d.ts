import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedQuestOptions } from './types';
/** Records the copies this plugin wrote into `app/src/quest`. */
export declare const QUEST_OVERLAY_STATE = ".expo-horizon-quest-overlays.json";
/**
 * Stages the patched Viro renderer and the controller mesh it loads into
 * `app/src/quest`, or removes the copies this plugin wrote there.
 *
 * A file at a target path is this plugin's when its state file recorded it or
 * when it is byte-for-byte the staged copy (an older @expo-pico/core wrote the
 * same files). Anything else belongs to the app: prebuild stops before
 * replacing it, and leaves it alone when the overlay is off.
 *
 * @throws when the overlay is on and a staged file is missing, or when it
 * would overwrite a file the app owns
 */
export declare function syncQuestRendererOverlay(platformRoot: string, options: Pick<ResolvedQuestOptions, 'viroRendererOverlay'>, stagedRoot?: string): void;
/** Runs {@linkcode syncQuestRendererOverlay} during prebuild. */
export declare const withQuestRendererOverlay: ConfigPlugin<ResolvedQuestOptions>;
//# sourceMappingURL=withQuestRendererOverlay.d.ts.map