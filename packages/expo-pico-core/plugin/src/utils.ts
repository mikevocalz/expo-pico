import type { ExportedConfigWithProps } from '@expo/config-plugins';

/**
 * Checks if a Gradle file already contains a specific string.
 * Used for idempotency — prevents duplicate injection.
 */
export function gradleContains(contents: string, marker: string): boolean {
  return contents.includes(marker);
}

/**
 * Inserts a block of text immediately after the first match of `afterPattern` in `source`.
 * Returns null if the pattern is not found.
 */
export function insertAfterPattern(
  source: string,
  afterPattern: RegExp,
  insertion: string
): string | null {
  const match = source.match(afterPattern);
  if (!match || match.index === undefined) {
    return null;
  }
  const insertPos = match.index + match[0].length;
  return source.slice(0, insertPos) + insertion + source.slice(insertPos);
}

/**
 * Writes a generated Gradle block that starts with `marker`.
 *
 * When `contents` has no `marker`, `rendered` is appended. When it has one,
 * the old block is replaced: from the marker to the brace that closes the
 * first `{` after it. Braces inside `//` and `/* *\/` comments and quoted
 * strings do not count. Text before and after the block is kept, so a
 * prebuild over an existing android/ picks up new pins, and running it again
 * changes nothing.
 *
 * `rendered` must contain `marker` and end with the block's closing brace
 * (trailing whitespace allowed).
 */
export function replaceMarkedBlock(contents: string, marker: string, rendered: string): string {
  const range = markedBlockRange(contents, marker);
  if (range === undefined) return contents + rendered;
  const replacement = rendered.slice(rendered.indexOf(marker), rendered.lastIndexOf('}') + 1);
  return contents.slice(0, range.start) + replacement + contents.slice(range.end);
}

/**
 * Where the generated block that starts with `marker` sits in `contents`:
 * `start` is the marker, `end` is one past the brace that closes the first
 * `{` after it. `undefined` when the marker is absent. Throws when the block
 * never closes.
 */
export function markedBlockRange(
  contents: string,
  marker: string
): { start: number; end: number } | undefined {
  const start = contents.indexOf(marker);
  if (start === -1) return undefined;
  const close = closingBraceAfter(contents, start + marker.length);
  if (close === -1) {
    throw new Error(
      `[expo-pico-core] The generated Gradle block after "${marker}" does not close. ` +
        'Delete it, or run `npx expo prebuild --clean`.'
    );
  }
  return { start, end: close + 1 };
}

/** Index of the `}` that closes the first `{` at or after `from`, or -1. */
function closingBraceAfter(source: string, from: number): number {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    const c = source[i];
    if (c === '/' && source[i + 1] === '/') {
      const eol = source.indexOf('\n', i);
      if (eol === -1) return -1;
      i = eol;
    } else if (c === '/' && source[i + 1] === '*') {
      const close = source.indexOf('*/', i + 2);
      if (close === -1) return -1;
      i = close + 1;
    } else if (c === '"' || c === "'") {
      i += 1;
      while (i < source.length && source[i] !== c) i += source[i] === '\\' ? 2 : 1;
    } else if (c === '{') {
      depth += 1;
    } else if (c === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Safely retrieves the main <application> node from a parsed AndroidManifest.
 */
export function getMainApplication(config: ExportedConfigWithProps<any>): any | null {
  return config.modResults.manifest?.application?.[0] ?? null;
}

/**
 * Safely retrieves the <manifest> root node from a parsed AndroidManifest.
 */
export function getManifestRoot(config: ExportedConfigWithProps<any>): any | null {
  return config.modResults.manifest ?? null;
}

/**
 * Ensures an array property exists on a manifest node.
 */
export function ensureArray<T extends Record<string, any>>(node: T, key: string): any[] {
  if (!node[key]) {
    (node as any)[key] = [];
  }
  return node[key];
}

/**
 * Checks if a meta-data entry with the given android:name already exists.
 */
export function hasMetaData(metaDataArray: any[], name: string): boolean {
  return metaDataArray.some((entry: any) => entry.$?.['android:name'] === name);
}

/**
 * Adds or updates a meta-data entry. Idempotent — will not duplicate.
 */
export function upsertMetaData(metaDataArray: any[], name: string, value: string): void {
  const existing = metaDataArray.find((entry: any) => entry.$?.['android:name'] === name);
  if (existing) {
    existing.$['android:value'] = value;
  } else {
    metaDataArray.push({
      $: {
        'android:name': name,
        'android:value': value,
      },
    });
  }
}

/**
 * Adds a uses-feature entry if not already present. Idempotent.
 */
export function addUsesFeature(featuresArray: any[], name: string, required: boolean = true): void {
  const exists = featuresArray.some((entry: any) => entry.$?.['android:name'] === name);
  if (!exists) {
    featuresArray.push({
      $: {
        'android:name': name,
        'android:required': String(required),
      },
    });
  }
}
