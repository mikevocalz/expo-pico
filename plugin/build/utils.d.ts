import type { ExportedConfigWithProps } from '@expo/config-plugins';
/**
 * Checks if a Gradle file already contains a specific string.
 * Used for idempotency — prevents duplicate injection.
 */
export declare function gradleContains(contents: string, marker: string): boolean;
/**
 * Inserts a block of text immediately after the first match of `afterPattern` in `source`.
 * Returns null if the pattern is not found.
 */
export declare function insertAfterPattern(source: string, afterPattern: RegExp, insertion: string): string | null;
/**
 * Safely retrieves the main <application> node from a parsed AndroidManifest.
 */
export declare function getMainApplication(config: ExportedConfigWithProps<any>): any | null;
/**
 * Safely retrieves the <manifest> root node from a parsed AndroidManifest.
 */
export declare function getManifestRoot(config: ExportedConfigWithProps<any>): any | null;
/**
 * Ensures an array property exists on a manifest node.
 */
export declare function ensureArray<T extends Record<string, any>>(node: T, key: string): any[];
/**
 * Checks if a meta-data entry with the given android:name already exists.
 */
export declare function hasMetaData(metaDataArray: any[], name: string): boolean;
/**
 * Adds or updates a meta-data entry. Idempotent — will not duplicate.
 */
export declare function upsertMetaData(metaDataArray: any[], name: string, value: string): void;
/**
 * Adds a uses-feature entry if not already present. Idempotent.
 */
export declare function addUsesFeature(featuresArray: any[], name: string, required?: boolean): void;
//# sourceMappingURL=utils.d.ts.map