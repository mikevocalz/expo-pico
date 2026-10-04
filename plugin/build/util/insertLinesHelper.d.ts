/**
 * Inserts a multi-line block into a source string after a single anchor line.
 *
 * Inspired by ReactVision/viro's `insertLinesHelper` (the same pattern used
 * to inject `packages.add(new ReactViroPackage(...))` into MainApplication).
 * Two improvements over the Viro original:
 *   1. The full insertion block is treated as the dedupe key — re-running with
 *      the same input is a no-op.
 *   2. Returns `null` when the anchor is not present, so callers can decide
 *      whether to throw, warn, or fall back. The Viro original throws.
 *
 * @param source       Original file contents.
 * @param insertion    Block of one or more lines to insert.
 * @param afterLine    Anchor line to find. Insertion happens immediately after
 *                     the line that contains this string. Matched as substring.
 * @returns updated contents, or null if anchor not found. Idempotent.
 */
export declare function insertLinesAfter(source: string, insertion: string, afterLine: string): string | null;
/**
 * Inserts an import statement near the top of a Kotlin/Java source file,
 * immediately after the `package …` declaration. Idempotent.
 */
export declare function insertImportAfterPackage(source: string, importStatement: string): string;
/**
 * Removes a previously-inserted block (by exact match) from a source file.
 * Used when a plugin option is toggled off and the corresponding block
 * needs to be cleaned up. Idempotent.
 */
export declare function removeBlock(source: string, block: string): string;
//# sourceMappingURL=insertLinesHelper.d.ts.map