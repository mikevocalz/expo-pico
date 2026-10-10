import { AndroidConfig, ConfigPlugin } from '@expo/config-plugins';
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

/**
 * Keeps Meta Horizon OS entries out of the mobile APK. A copy of
 * @expo-pico/core's module of the same name, which does the same for the pico
 * and dual flavors; the quest flavor owner keeps its entries out of mobile.
 *
 * `@reactvision/react-viro` with `xRMode: ['QUEST', ...]` writes Horizon OS
 * permissions, features, `com.oculus.supportedDevices` and VRActivity's
 * `com.oculus.intent.category.VR` filter and `com.oculus.vr.focusaware`
 * meta-data into the main manifest, and its `viro_renderer` AAR declares the
 * eye-tracking permission and feature. Every flavor merges main and the AARs,
 * so without this the PICO and phone APKs carried all of them.
 *
 * After the main manifest is written, a finalized mod reads it, collects every
 * entry whose name starts with one of {@link META_NAME_PREFIXES}, adds the AAR
 * entries in {@link LIBRARY_META_ENTRIES}, and writes a `tools:node="remove"`
 * marker for each into the pico and dual flavor manifests (when core has a
 * pico flavor) and the mobile flavor manifest (when a quest flavor exists).
 * The mobile manifest also gets the markers in {@link MOBILE_ONLY_REMOVALS}.
 * The quest flavor manifest is never touched.
 */

type Manifest = AndroidConfig.Manifest.AndroidManifest;
type Attrs = Record<string, string | undefined>;
type Entry = { $?: Attrs; [key: string]: unknown };
type Root = Record<string, unknown> & { $: Record<string, string> };

const ANDROID_NS = 'http://schemas.android.com/apk/res/android';
const TOOLS_NS = 'http://schemas.android.com/tools';

/** `android:name` prefixes that only Meta Horizon OS reads. */
export const META_NAME_PREFIXES = ['com.oculus.', 'oculus.', 'horizonos.', 'com.meta.'] as const;

/**
 * Meta entries declared by library manifests, which a config plugin cannot
 * read. From the `viro_renderer` AAR in `@reactvision/react-viro` 3.0.2.
 */
export const LIBRARY_META_ENTRIES: Readonly<MetaEntries> = {
  permissions: ['com.oculus.permission.EYE_TRACKING'],
  features: ['oculus.software.eye_tracking'],
  applicationMetaData: [],
  activities: [],
};

/**
 * Entries removed from the mobile flavor only. Viro's QUEST mode declares
 * `android.hardware.vr.headtracking` with `required="true"` in the main
 * manifest, and Play and the package installer refuse that APK on any phone.
 * The name is not Meta-only (PICO OS reads it too, and the pico flavor
 * declares its own), so the prefix match cannot catch it. The entry is
 * removed rather than flipped to `required="false"`: no phone has VR head
 * tracking, and nothing in the mobile build reads the declaration. Runtime
 * checks go through `PackageManager.hasSystemFeature`, which does not depend
 * on it.
 */
export const MOBILE_ONLY_REMOVALS: Readonly<MetaEntries> = {
  permissions: [],
  features: ['android.hardware.vr.headtracking'],
  applicationMetaData: [],
  activities: [],
};

/** The removals a flavor manifest gets: the shared Meta set, plus the mobile-only set on mobile. */
export function removalsForFlavor(flavor: string, entries: MetaEntries): MetaEntries {
  return flavor === 'mobile' ? mergeMetaEntries(entries, MOBILE_ONLY_REMOVALS) : entries;
}

export interface MetaIntentFilter {
  actions: string[];
  categories: string[];
}

export interface MetaActivityEntries {
  name: string;
  metaData: string[];
  /** Intent filters whose categories are all Meta-only. */
  intentFilters: MetaIntentFilter[];
}

export interface MetaEntries {
  permissions: string[];
  features: string[];
  applicationMetaData: string[];
  activities: MetaActivityEntries[];
}

/** True for an `android:name` that only means something on Meta Horizon OS. */
export function isMetaOnlyName(name: string | undefined): boolean {
  return !!name && META_NAME_PREFIXES.some((prefix) => name.startsWith(prefix));
}

const nameOf = (entry: Entry | undefined): string | undefined => entry?.$?.['android:name'];
const listOf = (owner: Record<string, unknown> | undefined, key: string): Entry[] =>
  (owner?.[key] as Entry[] | undefined) ?? [];

function addUnique(list: string[], value: string | undefined): void {
  if (value && !list.includes(value)) list.push(value);
}

/**
 * Collects the Meta-only entries of a manifest: permissions, features,
 * `<application>` meta-data, and per activity its meta-data and the intent
 * filters made only of Meta categories. A filter that mixes Meta and other
 * categories is skipped, since removing it would also drop the others.
 */
export function collectMetaEntries(manifest: Manifest): MetaEntries {
  const root = manifest.manifest as unknown as Root;
  const out: MetaEntries = {
    permissions: [],
    features: [],
    applicationMetaData: [],
    activities: [],
  };
  for (const e of listOf(root, 'uses-permission')) {
    if (isMetaOnlyName(nameOf(e))) addUnique(out.permissions, nameOf(e));
  }
  for (const e of listOf(root, 'uses-feature')) {
    if (isMetaOnlyName(nameOf(e))) addUnique(out.features, nameOf(e));
  }
  const application = listOf(root, 'application')[0];
  for (const e of listOf(application, 'meta-data')) {
    if (isMetaOnlyName(nameOf(e))) addUnique(out.applicationMetaData, nameOf(e));
  }
  for (const activity of listOf(application, 'activity')) {
    const name = nameOf(activity);
    if (!name) continue;
    const metaData: string[] = [];
    for (const e of listOf(activity, 'meta-data')) {
      if (isMetaOnlyName(nameOf(e))) addUnique(metaData, nameOf(e));
    }
    const intentFilters: MetaIntentFilter[] = [];
    for (const filter of listOf(activity, 'intent-filter')) {
      const categories = listOf(filter, 'category').map(nameOf);
      if (categories.length === 0 || !categories.every(isMetaOnlyName)) continue;
      if (listOf(filter, 'data').length > 0) continue;
      intentFilters.push({
        actions: listOf(filter, 'action')
          .map(nameOf)
          .filter((n): n is string => !!n),
        categories: categories as string[],
      });
    }
    if (metaData.length > 0 || intentFilters.length > 0) {
      out.activities.push({ name, metaData, intentFilters });
    }
  }
  return out;
}

/** Union of two collections, first-seen order. */
export function mergeMetaEntries(a: MetaEntries, b: MetaEntries): MetaEntries {
  const out: MetaEntries = {
    permissions: [...a.permissions],
    features: [...a.features],
    applicationMetaData: [...a.applicationMetaData],
    activities: a.activities.map((x) => ({
      name: x.name,
      metaData: [...x.metaData],
      intentFilters: [...x.intentFilters],
    })),
  };
  b.permissions.forEach((n) => addUnique(out.permissions, n));
  b.features.forEach((n) => addUnique(out.features, n));
  b.applicationMetaData.forEach((n) => addUnique(out.applicationMetaData, n));
  for (const activity of b.activities) {
    const target = out.activities.find((x) => x.name === activity.name);
    if (!target) {
      out.activities.push({
        name: activity.name,
        metaData: [...activity.metaData],
        intentFilters: [...activity.intentFilters],
      });
      continue;
    }
    activity.metaData.forEach((n) => addUnique(target.metaData, n));
    for (const filter of activity.intentFilters) {
      if (!target.intentFilters.some((f) => sameFilter(f, filter))) {
        target.intentFilters.push(filter);
      }
    }
  }
  return out;
}

function sameFilter(a: MetaIntentFilter, b: MetaIntentFilter): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Turns the entry for each name into a removal marker: an existing entry is
 * replaced (duplicates dropped), a missing one is appended.
 */
function markRemoved(owner: Record<string, unknown>, tag: string, names: readonly string[]): void {
  if (names.length === 0) return;
  const entries = listOf(owner, tag).slice();
  for (const name of names) {
    const hits = entries.filter((e) => nameOf(e) === name);
    const marker = { $: { 'android:name': name, 'tools:node': 'remove' } };
    if (hits.length === 0) {
      entries.push(marker);
      continue;
    }
    entries[entries.indexOf(hits[0])] = marker;
    for (const dup of hits.slice(1)) entries.splice(entries.indexOf(dup), 1);
  }
  owner[tag] = entries;
}

function filterMarker(filter: MetaIntentFilter): Entry {
  const marker: Entry = { $: { 'tools:node': 'remove' } };
  if (filter.actions.length > 0) {
    marker.action = filter.actions.map((n) => ({ $: { 'android:name': n } }));
  }
  marker.category = filter.categories.map((n) => ({ $: { 'android:name': n } }));
  return marker;
}

function filterKey(filter: Entry): string {
  return JSON.stringify({
    actions: listOf(filter, 'action').map(nameOf),
    categories: listOf(filter, 'category').map(nameOf),
  });
}

/**
 * Writes a `tools:node="remove"` marker into a flavor manifest for each
 * collected entry. Activity entries go on a `tools:node="merge"` copy of the
 * activity, reusing one the manifest already has. Returns true when the
 * manifest changed. Idempotent.
 */
export function applyMetaEntryRemovals(manifest: Manifest, entries: MetaEntries): boolean {
  const before = JSON.stringify(manifest);
  const root = manifest.manifest as unknown as Root;
  root.$ ??= {} as Record<string, string>;
  const hasWork =
    entries.permissions.length > 0 ||
    entries.features.length > 0 ||
    entries.applicationMetaData.length > 0 ||
    entries.activities.length > 0;
  if (!hasWork) return false;
  root.$['xmlns:android'] ??= ANDROID_NS;
  root.$['xmlns:tools'] ??= TOOLS_NS;

  markRemoved(root, 'uses-permission', entries.permissions);
  markRemoved(root, 'uses-feature', entries.features);

  if (entries.applicationMetaData.length > 0 || entries.activities.length > 0) {
    const applications = listOf(root, 'application');
    if (applications.length === 0) applications.push({ $: {} });
    root.application = applications;
    const application = applications[0];
    markRemoved(application, 'meta-data', entries.applicationMetaData);

    for (const wanted of entries.activities) {
      const activities = listOf(application, 'activity');
      let activity = activities.find((a) => nameOf(a) === wanted.name);
      if (!activity) {
        activity = { $: { 'android:name': wanted.name, 'tools:node': 'merge' } };
        activities.push(activity);
      }
      application.activity = activities;
      markRemoved(activity, 'meta-data', wanted.metaData);
      if (wanted.intentFilters.length > 0) {
        const filters = listOf(activity, 'intent-filter');
        for (const filter of wanted.intentFilters) {
          const marker = filterMarker(filter);
          const key = filterKey(marker);
          const idx = filters.findIndex((f) => filterKey(f) === key);
          if (idx === -1) filters.push(marker);
          else filters[idx] = marker;
        }
        activity['intent-filter'] = filters;
      }
    }
  }
  return JSON.stringify(manifest) !== before;
}

/**
 * Reads `app/src/main/AndroidManifest.xml` and writes the removal markers
 * into each flavor manifest in `flavors`. The pico and dual manifests are
 * edited only when they exist (core writes them); the mobile one is created
 * when missing.
 */
export async function syncMetaEntryRemovals(
  platformRoot: string,
  flavors: readonly string[]
): Promise<void> {
  if (flavors.length === 0) return;
  const mainPath = path.join(platformRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
  const fromMain = fs.existsSync(mainPath)
    ? collectMetaEntries(await AndroidConfig.Manifest.readAndroidManifestAsync(mainPath))
    : { permissions: [], features: [], applicationMetaData: [], activities: [] };
  const entries = mergeMetaEntries(fromMain, LIBRARY_META_ENTRIES);

  for (const flavor of flavors) {
    const flavorPath = path.join(platformRoot, 'app', 'src', flavor, 'AndroidManifest.xml');
    const exists = fs.existsSync(flavorPath);
    if (!exists && flavor !== 'mobile') continue;
    const manifest: Manifest = exists
      ? await AndroidConfig.Manifest.readAndroidManifestAsync(flavorPath)
      : { manifest: { $: { 'xmlns:android': ANDROID_NS } } as Manifest['manifest'] };
    if (!applyMetaEntryRemovals(manifest, removalsForFlavor(flavor, entries))) continue;
    if (!exists) fs.mkdirSync(path.dirname(flavorPath), { recursive: true });
    await AndroidConfig.Manifest.writeAndroidManifestAsync(flavorPath, manifest);
  }
}

/**
 * Registers the finalized mod. Finalized, because the main manifest Viro
 * edits is written by the manifest base mod, and the pico manifest is
 * rewritten from scratch by a dangerous mod; both have run by then.
 */
export const withMetaEntryRemovals: ConfigPlugin = (config) =>
  withFinalizedMod(config, [
    'android',
    async (cfg) => {
      await syncMetaEntryRemovals(cfg.modRequest.platformProjectRoot, ['mobile']);
      return cfg;
    },
  ]) as typeof config;
