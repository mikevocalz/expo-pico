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
export function insertLinesAfter(
  source: string,
  insertion: string,
  afterLine: string
): string | null {
  if (source.includes(insertion)) {
    return source;
  }

  const lines = source.split('\n');
  const anchorIndex = lines.findIndex((line) => line.includes(afterLine));
  if (anchorIndex === -1) {
    return null;
  }

  const before = lines.slice(0, anchorIndex + 1);
  const after = lines.slice(anchorIndex + 1);
  const inserted = insertion.split('\n');
  return [...before, ...inserted, ...after].join('\n');
}

/**
 * Inserts an import statement near the top of a Kotlin/Java source file,
 * immediately after the `package …` declaration. Idempotent.
 */
export function insertImportAfterPackage(
  source: string,
  importStatement: string
): string {
  if (source.includes(importStatement)) {
    return source;
  }
  const result = source.replace(
    /(package\s+[\w.`]+\s*;?\s*\n)/,
    (match) => `${match}\n${importStatement}\n`
  );
  return result === source ? source : result;
}

/**
 * Removes a previously-inserted block (by exact match) from a source file.
 * Used when a plugin option is toggled off and the corresponding block
 * needs to be cleaned up. Idempotent.
 */
export function removeBlock(source: string, block: string): string {
  if (!source.includes(block)) {
    return source;
  }
  return source.replace(block, '').replace(/\n{3,}/g, '\n\n');
}
