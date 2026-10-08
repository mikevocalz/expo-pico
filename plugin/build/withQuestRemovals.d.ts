import { AndroidConfig, ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Quest-flavor removals: permissions, features and Maven dependencies that
 * other plugins or libraries add to every flavor but the Meta Horizon build
 * does not use.
 *
 * Permissions and features become `tools:node="remove"` entries in
 * `app/src/quest/AndroidManifest.xml`, the same mechanism expo-horizon-core
 * uses for Meta's prohibited list, so pico, mobile and main keep theirs.
 * Dependencies are excluded from the quest compile and runtime classpaths
 * only.
 */
type Manifest = AndroidConfig.Manifest.AndroidManifest;
export declare const QUEST_EXCLUSIONS_MARKER = "// expo-pico-core: quest dependency exclusions";
/** `group:module` coordinates; throws on anything else. */
export declare function normalizeDependencyExclusions(values: readonly string[] | undefined): string[];
/** Trims, drops blanks and duplicates, keeps order. */
export declare function normalizeNames(values: readonly string[] | undefined): string[];
/** Applies the removals to a parsed quest manifest. Returns true when it changed. */
export declare function applyQuestManifestRemovals(manifest: Manifest, permissions: readonly string[], features: readonly string[]): boolean;
/**
 * Brings `app/src/quest/AndroidManifest.xml` in line with the options. The
 * quest manifest belongs to expo-horizon-core, so this never creates one.
 */
export declare function syncQuestManifestRemovals(platformRoot: string, options: Pick<ResolvedPicoOptions, 'questRemovePermissions' | 'questRemoveFeatures'>): Promise<void>;
export declare function renderQuestExclusionsBlock(coordinates: readonly string[]): string;
export declare function stripQuestExclusionsBlock(contents: string): string;
/** Returns app/build.gradle with exactly one current block, or none. */
export declare function applyQuestExclusionsGradle(contents: string, coordinates: readonly string[]): string;
export declare const withQuestRemovals: ConfigPlugin<ResolvedPicoOptions>;
export {};
//# sourceMappingURL=withQuestRemovals.d.ts.map