import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest,
  withDangerousMod,
} from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

type ConfigLike = Parameters<ConfigPlugin>[0];
type ManifestEntry = { $: Record<string, string> };
type Manifest = AndroidConfig.Manifest.AndroidManifest;
type ManifestRoot = Manifest['manifest'];
type UsesPermission = NonNullable<ManifestRoot['uses-permission']>[number];
type UsesFeature = NonNullable<ManifestRoot['uses-feature']>[number];

/**
 * Key under `config._internal` where PICO-only manifest requests are recorded.
 */
const STATE_KEY = 'expoPicoFlavorManifest';

/** Plugins known to add a `quest` product flavor on their own. */
const QUEST_FLAVOR_PLUGINS = ['expo-horizon-core'];

export interface PicoFlavorFeature {
  name: string;
  required: boolean;
}

export interface PicoFlavorMetaData {
  name: string;
  value: string;
  /**
   * With a pico flavor, also write it to the `mobile` flavor manifest. For
   * PICO Platform Service meta-data such as `pvr.app.id`: a mobile APK can
   * still call PPS, a quest APK cannot.
   */
  mobileFlavor: boolean;
}

export interface PicoFlavorManifestState {
  /**
   * True once `withPico` (enabled, `buildVariant` `pico` or `dual`) has
   * registered the mod that writes `android/app/src/pico/AndroidManifest.xml`.
   */
  hasPicoFlavor: boolean;
  /**
   * Forces quest-flavor detection on. Otherwise a quest flavor is assumed when
   * a plugin in {@link QUEST_FLAVOR_PLUGINS} is listed (it adds `mobile` and
   * `quest` flavors when core has none).
   */
  hasQuestFlavor: boolean;
  permissions: string[];
  features: PicoFlavorFeature[];
  metaData: PicoFlavorMetaData[];
  mobileWriterRegistered: boolean;
}

/**
 * Where PICO-only entries go:
 * - `pico-flavor`: core has a pico flavor. Pico and dual flavor manifests get
 *   everything; the mobile flavor gets meta-data marked `mobileFlavor`.
 * - `mobile-flavor`: no pico flavor, but a quest flavor exists (for example
 *   `buildVariant: 'mobile'` next to expo-horizon-core). The mobile flavor
 *   manifest gets everything, so the quest APK gets nothing.
 * - `main`: a single-variant app. Everything goes to the main manifest.
 *
 * Main gets PICO entries only on the `main` route; otherwise a copy left by an
 * older prebuild is removed.
 */
export type PicoManifestRoute = 'pico-flavor' | 'mobile-flavor' | 'main';

/**
 * Shared state for PICO-only manifest entries. Plugins record their entries
 * here when the config is evaluated; mods read it later, after every plugin
 * has run, so plugin order does not matter.
 */
export function getPicoFlavorManifestState(config: ConfigLike): PicoFlavorManifestState {
  config._internal ??= {};
  const existing = config._internal[STATE_KEY] as Partial<PicoFlavorManifestState> | undefined;
  // Fill missing fields so state written by an older copy of this module
  // (for example a second installed core) cannot crash a lookup.
  const state: PicoFlavorManifestState = {
    hasPicoFlavor: existing?.hasPicoFlavor ?? false,
    hasQuestFlavor: existing?.hasQuestFlavor ?? false,
    permissions: existing?.permissions ?? [],
    features: existing?.features ?? [],
    metaData: existing?.metaData ?? [],
    mobileWriterRegistered: existing?.mobileWriterRegistered ?? false,
  };
  if (existing) Object.assign(existing, state);
  const result = (existing ?? state) as PicoFlavorManifestState;
  config._internal[STATE_KEY] = result;
  return result;
}

/** Called by `withPico` when it writes a pico (and dual) flavor manifest. */
export function markPicoFlavorPresent(config: ConfigLike): void {
  getPicoFlavorManifestState(config).hasPicoFlavor = true;
}

export function resolvePicoManifestRoute(config: ConfigLike): PicoManifestRoute {
  const state = getPicoFlavorManifestState(config);
  if (state.hasPicoFlavor) return 'pico-flavor';
  if (hasQuestFlavor(config)) return 'mobile-flavor';
  return 'main';
}

/** True when the app has a `quest` product flavor (see {@link PicoFlavorManifestState.hasQuestFlavor}). */
export function hasQuestFlavor(config: ConfigLike): boolean {
  return getPicoFlavorManifestState(config).hasQuestFlavor || listsQuestFlavorPlugin(config);
}

function listsQuestFlavorPlugin(config: ConfigLike): boolean {
  return (config.plugins ?? []).some((entry) => {
    const name = Array.isArray(entry) ? entry[0] : entry;
    return typeof name === 'string' && QUEST_FLAVOR_PLUGINS.includes(name);
  });
}

/**
 * Declares a PICO-only `<uses-permission>`, routed per
 * {@link PicoManifestRoute}. The quest flavor never gets it.
 */
export const withPicoFlavorPermission: ConfigPlugin<string> = (config, name) => {
  const state = getPicoFlavorManifestState(config);
  if (!state.permissions.includes(name)) state.permissions.push(name);
  config = withPicoMobileFlavorManifest(config);
  return withAndroidManifest(config, (cfg) => {
    const root = cfg.modResults.manifest;
    if (resolvePicoManifestRoute(cfg) !== 'main') {
      if (root['uses-permission']) {
        root['uses-permission'] = removeByName(root['uses-permission'], name);
      }
      return cfg;
    }
    upsertPermission((root['uses-permission'] ??= []), name);
    return cfg;
  });
};

/**
 * Declares a PICO-only `<uses-feature>`, routed like
 * {@link withPicoFlavorPermission}. When several plugins declare the same
 * feature, it is required if any of them asks for `required: true`, so the
 * result does not depend on plugin order.
 */
export const withPicoFlavorFeature: ConfigPlugin<{ name: string; required?: boolean }> = (
  config,
  { name, required = false }
) => {
  const state = getPicoFlavorManifestState(config);
  const recorded = state.features.find((f) => f.name === name);
  if (recorded) recorded.required ||= required;
  else state.features.push({ name, required });
  config = withPicoMobileFlavorManifest(config);
  return withAndroidManifest(config, (cfg) => {
    const root = cfg.modResults.manifest;
    if (resolvePicoManifestRoute(cfg) !== 'main') {
      if (root['uses-feature']) root['uses-feature'] = removeByName(root['uses-feature'], name);
      return cfg;
    }
    const current = getPicoFlavorManifestState(cfg).features.find((f) => f.name === name);
    upsertFeature((root['uses-feature'] ??= []), name, current?.required ?? required);
    return cfg;
  });
};

/**
 * Declares PICO-only `<application>` meta-data, routed like
 * {@link withPicoFlavorPermission}; on the `pico-flavor` route `mobileFlavor`
 * adds the mobile flavor manifest. A later declaration of the same name
 * replaces the value on the `main` and `mobile-flavor` routes. In the pico
 * flavor manifest, an entry core already wrote (such as `pvr.app.type` from
 * `appType`) is kept.
 */
export const withPicoFlavorMetaData: ConfigPlugin<{
  name: string;
  value: string;
  mobileFlavor?: boolean;
}> = (config, { name, value, mobileFlavor = false }) => {
  const state = getPicoFlavorManifestState(config);
  const recorded = state.metaData.find((m) => m.name === name);
  if (recorded) {
    recorded.value = value;
    recorded.mobileFlavor ||= mobileFlavor;
  } else {
    state.metaData.push({ name, value, mobileFlavor });
  }
  config = withPicoMobileFlavorManifest(config);
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application) return cfg;
    if (resolvePicoManifestRoute(cfg) !== 'main') {
      if (application['meta-data']) {
        application['meta-data'] = removeByName(application['meta-data'], name);
      }
      return cfg;
    }
    const entry = getPicoFlavorManifestState(cfg).metaData.find((m) => m.name === name);
    upsertMetaData((application['meta-data'] ??= []), name, entry?.value ?? value);
    return cfg;
  });
};

/**
 * Writes the recorded entries into the pico flavor manifest. Entries already
 * present (for example a feature core emits itself) are left as they are.
 */
export function applyPicoFlavorEntries(
  manifest: Manifest,
  state: PicoFlavorManifestState
): Manifest {
  const root = manifest.manifest;
  const permissions = (root['uses-permission'] ??= []);
  for (const name of state.permissions) {
    if (!hasName(permissions, name)) permissions.push({ $: { 'android:name': name } });
  }
  const features = (root['uses-feature'] ??= []);
  for (const { name, required } of state.features) {
    if (!hasName(features, name)) upsertFeature(features, name, required);
  }
  const metaData = (ensureApplication(manifest)['meta-data'] ??= []);
  for (const { name, value } of state.metaData) {
    if (!hasName(metaData, name)) upsertMetaData(metaData, name, value);
  }
  return manifest;
}

/**
 * Brings the mobile flavor manifest in line with the route: upserts the
 * entries it should carry and removes any other PICO entry (`com.picovr.*` /
 * `com.pico.*` permissions, `pico.*` features, `pvr.*` / `com.pico.*`
 * meta-data), so a value left by an older prebuild does not survive.
 * Returns true when the manifest changed.
 */
export function applyMobileFlavorEntries(
  manifest: Manifest,
  state: PicoFlavorManifestState,
  route: PicoManifestRoute
): boolean {
  const before = JSON.stringify(manifest);
  const everything = route === 'mobile-flavor';
  const permissions = everything ? state.permissions : [];
  const features = everything ? state.features : [];
  const metaData =
    route === 'main'
      ? []
      : everything
        ? state.metaData
        : state.metaData.filter((m) => m.mobileFlavor);

  const root = manifest.manifest;
  if (root['uses-permission']) {
    root['uses-permission'] = root['uses-permission'].filter(
      (p) => !isPicoPermission(p.$['android:name']) || permissions.includes(p.$['android:name'])
    );
  }
  if (root['uses-feature']) {
    root['uses-feature'] = root['uses-feature'].filter(
      (f) =>
        !isPicoFeature(f.$['android:name']) || features.some((x) => x.name === f.$['android:name'])
    );
  }
  const application = root.application?.[0];
  if (application?.['meta-data']) {
    application['meta-data'] = application['meta-data'].filter(
      (m) =>
        !isPicoMetaData(m.$['android:name']) || metaData.some((x) => x.name === m.$['android:name'])
    );
  }

  if (permissions.length > 0) {
    const list = (root['uses-permission'] ??= []);
    for (const name of permissions) upsertPermission(list, name);
  }
  if (features.length > 0) {
    const list = (root['uses-feature'] ??= []);
    for (const { name, required } of features) upsertFeature(list, name, required);
  }
  if (metaData.length > 0) {
    const list = (ensureApplication(manifest)['meta-data'] ??= []);
    for (const { name, value } of metaData) upsertMetaData(list, name, value);
  }
  return JSON.stringify(manifest) !== before;
}

/**
 * Registers, once per config, the mod that maintains
 * `android/app/src/mobile/AndroidManifest.xml`. It creates the file only when
 * there is something to write, and otherwise only edits an existing one.
 */
export const withPicoMobileFlavorManifest: ConfigPlugin = (config) => {
  const state = getPicoFlavorManifestState(config);
  if (state.mobileWriterRegistered) return config;
  state.mobileWriterRegistered = true;
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const mobilePath = path.join(
        cfg.modRequest.projectRoot,
        'android',
        'app',
        'src',
        'mobile',
        'AndroidManifest.xml'
      );
      const exists = fs.existsSync(mobilePath);
      const manifest: Manifest = exists
        ? await AndroidConfig.Manifest.readAndroidManifestAsync(mobilePath)
        : {
            manifest: {
              $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
              queries: [],
            },
          };
      const changed = applyMobileFlavorEntries(
        manifest,
        getPicoFlavorManifestState(cfg),
        resolvePicoManifestRoute(cfg)
      );
      if (!changed) return cfg;
      if (!exists) fs.mkdirSync(path.dirname(mobilePath), { recursive: true });
      await AndroidConfig.Manifest.writeAndroidManifestAsync(mobilePath, manifest);
      return cfg;
    },
  ]);
};

function isPicoPermission(name: string | undefined): boolean {
  return !!name && (name.startsWith('com.picovr.') || name.startsWith('com.pico.'));
}

function isPicoFeature(name: string | undefined): boolean {
  return !!name && name.startsWith('pico.');
}

function isPicoMetaData(name: string | undefined): boolean {
  return !!name && (name.startsWith('pvr.') || name.startsWith('com.pico.'));
}

function ensureApplication(manifest: Manifest): AndroidConfig.Manifest.ManifestApplication {
  const list = (manifest.manifest.application ??= []);
  if (list.length === 0) list.push({ $: {} } as AndroidConfig.Manifest.ManifestApplication);
  return list[0];
}

function upsertPermission(list: UsesPermission[], name: string) {
  if (!hasName(list, name)) list.push({ $: { 'android:name': name } });
}

function upsertFeature(list: UsesFeature[], name: string, required: boolean): void {
  const entry = {
    $: { 'android:name': name, 'android:required': required ? 'true' : 'false' } as const,
  };
  const idx = list.findIndex((e) => e.$?.['android:name'] === name);
  if (idx === -1) list.push(entry);
  else list[idx] = entry;
}

function upsertMetaData(list: ManifestEntry[], name: string, value: string): void {
  const entry = { $: { 'android:name': name, 'android:value': value } };
  const idx = list.findIndex((e) => e.$?.['android:name'] === name);
  if (idx === -1) list.push(entry);
  else list[idx] = entry;
}

function hasName(list: readonly { $: { 'android:name'?: string } }[], name: string): boolean {
  return list.some((entry) => entry.$?.['android:name'] === name);
}

function removeByName<T extends { $: { 'android:name'?: string } }>(list: T[], name: string): T[] {
  return list.filter((entry) => entry.$?.['android:name'] !== name);
}
