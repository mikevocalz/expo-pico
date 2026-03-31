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
 * Safely retrieves the main <application> node from a parsed AndroidManifest.
 */
export function getMainApplication(
  config: ExportedConfigWithProps<any>
): any | null {
  return config.modResults.manifest?.application?.[0] ?? null;
}

/**
 * Safely retrieves the <manifest> root node from a parsed AndroidManifest.
 */
export function getManifestRoot(
  config: ExportedConfigWithProps<any>
): any | null {
  return config.modResults.manifest ?? null;
}

/**
 * Ensures an array property exists on a manifest node.
 */
export function ensureArray<T extends Record<string, any>>(
  node: T,
  key: string
): any[] {
  if (!node[key]) {
    (node as any)[key] = [];
  }
  return node[key];
}

/**
 * Checks if a meta-data entry with the given android:name already exists.
 */
export function hasMetaData(metaDataArray: any[], name: string): boolean {
  return metaDataArray.some(
    (entry: any) => entry.$?.['android:name'] === name
  );
}

/**
 * Adds or updates a meta-data entry. Idempotent — will not duplicate.
 */
export function upsertMetaData(
  metaDataArray: any[],
  name: string,
  value: string
): void {
  const existing = metaDataArray.find(
    (entry: any) => entry.$?.['android:name'] === name
  );
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
export function addUsesFeature(
  featuresArray: any[],
  name: string,
  required: boolean = true
): void {
  const exists = featuresArray.some(
    (entry: any) => entry.$?.['android:name'] === name
  );
  if (!exists) {
    featuresArray.push({
      $: {
        'android:name': name,
        'android:required': String(required),
      },
    });
  }
}
