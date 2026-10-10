import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedQuestOptions } from './types';
/**
 * The quest flavor's settings, appended to `app/build.gradle` and rewritten on
 * every prebuild.
 *
 * expo-horizon-core declares `mobile` and `quest` only when the file has no
 * flavors yet; when another plugin declared the `device` dimension first
 * (PICO), it skips. Declaring `quest` here keeps the flavor in both cases.
 * The block never mentions `flavorDimensions`, so expo-horizon-core's own
 * check still adds the dimension when nothing else did.
 */
export declare function updateQuestFlavorBlock(contents: string, options: ResolvedQuestOptions): string;
/**
 * Project-level fixes the quest flavor needs: expo-horizon-core 57.0.2 reads
 * a BuildConfig field AGP 9 no longer generates by default, and autolinked
 * modules without the `device` dimension need a fallback to resolve flavored
 * libraries under questDebug.
 */
export declare function updateQuestProjectGradle(contents: string): string;
/** Applies {@linkcode updateQuestFlavorBlock} and {@linkcode updateQuestProjectGradle}. */
export declare const withQuestGradle: ConfigPlugin<ResolvedQuestOptions>;
//# sourceMappingURL=withQuestGradle.d.ts.map