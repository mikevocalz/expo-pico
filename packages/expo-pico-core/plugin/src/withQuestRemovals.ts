import { AndroidConfig, ConfigPlugin, withAppBuildGradle } from '@expo/config-plugins';
// withFinalizedMod runs after every other mod, dangerous mods included.
// Imported via the deep path because some older @expo/config-plugins
// releases don't re-export it.
const finalizedModExports = require('@expo/config-plugins/build/plugins/withFinalizedMod');
const withFinalizedMod = finalizedModExports.withFinalizedMod as (
  config: unknown,
  args: ['android', (cfg: { modRequest: { platformProjectRoot: string } }) => unknown]
) => unknown;
import * as fs from 'fs';
import * as path from 'path';

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
type Entry = { $: Record<string, string | undefined> };

const TOOLS_NS = 'http://schemas.android.com/tools';

export const QUEST_EXCLUSIONS_MARKER = '// expo-pico-core: quest dependency exclusions';
const QUEST_EXCLUSIONS_END = '// expo-pico-core: end quest dependency exclusions';

/** `group:module` coordinates; throws on anything else. */
export function normalizeDependencyExclusions(values: readonly string[] | undefined): string[] {
  const out: string[] = [];
  for (const raw of values ?? []) {
    const v = typeof raw === 'string' ? raw.trim() : '';
    const parts = v.split(':');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(
        `[expo-pico-core] questExcludeDependencies entries must be "group:module", got ${JSON.stringify(raw)}.`
      );
    }
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

/** Trims, drops blanks and duplicates, keeps order. */
export function normalizeNames(values: readonly string[] | undefined): string[] {
  const out: string[] = [];
  for (const raw of values ?? []) {
    const v = typeof raw === 'string' ? raw.trim() : '';
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

/**
 * Adds a `tools:node="remove"` entry for each name under `tag`. An existing
 * entry for the name is turned into a removal rather than duplicated.
 */
function applyRemovals(
  root: Record<string, unknown>,
  tag: 'uses-permission' | 'uses-feature',
  names: readonly string[]
): void {
  if (names.length === 0) return;
  const entries = ((root[tag] as Entry[] | undefined) ?? []).slice();
  for (const name of names) {
    const hit = entries.filter((e) => e.$?.['android:name'] === name);
    if (hit.length === 0) {
      entries.push({ $: { 'android:name': name, 'tools:node': 'remove' } });
      continue;
    }
    hit[0].$ = { 'android:name': name, 'tools:node': 'remove' };
    for (const dup of hit.slice(1)) entries.splice(entries.indexOf(dup), 1);
  }
  root[tag] = entries;
}

/** Applies the removals to a parsed quest manifest. Returns true when it changed. */
export function applyQuestManifestRemovals(
  manifest: Manifest,
  permissions: readonly string[],
  features: readonly string[]
): boolean {
  if (permissions.length === 0 && features.length === 0) return false;
  const before = JSON.stringify(manifest);
  const root = manifest.manifest as unknown as Record<string, unknown> & {
    $: Record<string, string>;
  };
  root.$['xmlns:tools'] = root.$['xmlns:tools'] ?? TOOLS_NS;
  applyRemovals(root, 'uses-permission', permissions);
  applyRemovals(root, 'uses-feature', features);
  return JSON.stringify(manifest) !== before;
}

/**
 * Brings `app/src/quest/AndroidManifest.xml` in line with the options. The
 * quest manifest belongs to expo-horizon-core, so this never creates one.
 */
export async function syncQuestManifestRemovals(
  platformRoot: string,
  options: Pick<ResolvedPicoOptions, 'questRemovePermissions' | 'questRemoveFeatures'>
): Promise<void> {
  const questPath = path.join(platformRoot, 'app', 'src', 'quest', 'AndroidManifest.xml');
  if (!fs.existsSync(questPath)) return;
  const manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(questPath);
  if (
    !applyQuestManifestRemovals(
      manifest,
      options.questRemovePermissions,
      options.questRemoveFeatures
    )
  ) {
    return;
  }
  await AndroidConfig.Manifest.writeAndroidManifestAsync(questPath, manifest);
}

export function renderQuestExclusionsBlock(coordinates: readonly string[]): string {
  const lines = coordinates
    .map((c) => {
      const [group, module] = c.split(':');
      return `        c.exclude group: "${group}", module: "${module}"`;
    })
    .join('\n');
  return `${QUEST_EXCLUSIONS_MARKER}
// Set by questExcludeDependencies. Quest classpaths only; every other flavor
// keeps these artifacts.
configurations.configureEach { c ->
    if (c.name.startsWith("quest") && (c.name.endsWith("CompileClasspath") || c.name.endsWith("RuntimeClasspath"))) {
${lines}
    }
}
${QUEST_EXCLUSIONS_END}
`;
}

export function stripQuestExclusionsBlock(contents: string): string {
  const start = contents.indexOf(QUEST_EXCLUSIONS_MARKER);
  if (start === -1) return contents;
  const endMarker = contents.indexOf(QUEST_EXCLUSIONS_END, start);
  if (endMarker === -1) return contents;
  let end = endMarker + QUEST_EXCLUSIONS_END.length;
  if (contents[end] === '\n') end += 1;
  let from = start;
  if (from > 0 && contents[from - 1] === '\n') from -= 1;
  return contents.slice(0, from) + contents.slice(end);
}

/** Returns app/build.gradle with exactly one current block, or none. */
export function applyQuestExclusionsGradle(
  contents: string,
  coordinates: readonly string[]
): string {
  const stripped = stripQuestExclusionsBlock(contents);
  if (coordinates.length === 0) return stripped;
  return stripped.replace(/\n*$/, '\n\n') + renderQuestExclusionsBlock(coordinates);
}

export const withQuestRemovals: ConfigPlugin<ResolvedPicoOptions> = (config, options) => {
  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      if (options.questExcludeDependencies.length > 0) {
        console.warn(
          '[expo-pico-core] questExcludeDependencies needs a Groovy app/build.gradle; skipping.'
        );
      }
      return cfg;
    }
    cfg.modResults.contents = applyQuestExclusionsGradle(
      cfg.modResults.contents,
      options.questExcludeDependencies
    );
    return cfg;
  });
  // Finalized for the same reason as withQuestStoreDeviceTargets:
  // expo-horizon-core rewrites the quest manifest in a dangerous mod.
  return withFinalizedMod(config, [
    'android',
    async (cfg) => {
      await syncQuestManifestRemovals(cfg.modRequest.platformProjectRoot, options);
      return cfg;
    },
  ]) as typeof config;
};
