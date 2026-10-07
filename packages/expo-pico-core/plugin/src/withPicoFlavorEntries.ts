import { AndroidConfig, ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

type ConfigLike = Parameters<ConfigPlugin>[0];
type ManifestEntry = { $: Record<string, string> };

/**
 * Key under `config._internal` where PICO-only manifest requests are recorded.
 */
const STATE_KEY = 'expoPicoFlavorManifest';

export interface PicoFlavorFeature {
  name: string;
  required: boolean;
}

export interface PicoFlavorManifestState {
  /**
   * True once `withPico` (enabled, `buildVariant` `pico` or `dual`) has
   * registered the mod that writes `android/app/src/pico/AndroidManifest.xml`.
   * False when core is missing, disabled, or `buildVariant: 'mobile'`: the
   * app then has a single variant and PICO entries belong in the main manifest.
   */
  hasPicoFlavor: boolean;
  permissions: string[];
  features: PicoFlavorFeature[];
}

/**
 * Shared state for PICO-only manifest entries. Feature plugins record their
 * permissions and features here when the config is evaluated; mods read it
 * later, after every plugin has run, so plugin order does not matter.
 */
export function getPicoFlavorManifestState(config: ConfigLike): PicoFlavorManifestState {
  config._internal ??= {};
  const existing = config._internal[STATE_KEY] as PicoFlavorManifestState | undefined;
  if (existing) return existing;
  const state: PicoFlavorManifestState = { hasPicoFlavor: false, permissions: [], features: [] };
  config._internal[STATE_KEY] = state;
  return state;
}

/** Called by `withPico` when it writes a pico (and dual) flavor manifest. */
export function markPicoFlavorPresent(config: ConfigLike): void {
  getPicoFlavorManifestState(config).hasPicoFlavor = true;
}

/**
 * Declares a PICO-only `<uses-permission>`.
 *
 * With a pico flavor (`buildVariant` `pico` or `dual`) the permission goes
 * into `android/app/src/pico/AndroidManifest.xml` (and the dual one), so the
 * quest and mobile APKs never request it. Any copy a previous prebuild left in
 * the main manifest is removed. Without a pico flavor it goes into the main
 * manifest, as before.
 */
export const withPicoFlavorPermission: ConfigPlugin<string> = (config, name) => {
  const state = getPicoFlavorManifestState(config);
  if (!state.permissions.includes(name)) state.permissions.push(name);
  return withAndroidManifest(config, (cfg) => {
    const root = cfg.modResults.manifest;
    if (getPicoFlavorManifestState(cfg).hasPicoFlavor) {
      if (root['uses-permission']) {
        root['uses-permission'] = removeByName(root['uses-permission'], name);
      }
      return cfg;
    }
    const list = (root['uses-permission'] ??= []);
    if (!hasName(list, name)) list.push({ $: { 'android:name': name } });
    return cfg;
  });
};

/**
 * Declares a PICO-only `<uses-feature>`. Routing matches
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
  return withAndroidManifest(config, (cfg) => {
    const root = cfg.modResults.manifest;
    const current = getPicoFlavorManifestState(cfg);
    if (current.hasPicoFlavor) {
      if (root['uses-feature']) root['uses-feature'] = removeByName(root['uses-feature'], name);
      return cfg;
    }
    const isRequired = current.features.find((f) => f.name === name)?.required ?? required;
    const list = (root['uses-feature'] ??= []);
    const entry = {
      $: { 'android:name': name, 'android:required': isRequired ? 'true' : 'false' } as const,
    };
    const idx = list.findIndex((e) => e.$?.['android:name'] === name);
    if (idx === -1) list.push(entry);
    else list[idx] = entry;
    return cfg;
  });
};

/**
 * Writes the recorded entries into the pico flavor manifest. Entries already
 * present (for example a feature core emits itself) are left as they are.
 */
export function applyPicoFlavorEntries(
  manifest: AndroidConfig.Manifest.AndroidManifest,
  state: PicoFlavorManifestState
): AndroidConfig.Manifest.AndroidManifest {
  const root = manifest.manifest;
  const permissions = (root['uses-permission'] ??= []) as ManifestEntry[];
  for (const name of state.permissions) {
    if (!hasName(permissions, name)) permissions.push({ $: { 'android:name': name } });
  }
  const features = (root['uses-feature'] ??= []) as ManifestEntry[];
  for (const { name, required } of state.features) {
    if (!hasName(features, name)) {
      features.push({ $: { 'android:name': name, 'android:required': String(required) } });
    }
  }
  return manifest;
}

function hasName(list: readonly ManifestEntry[], name: string): boolean {
  return list.some((entry) => entry.$?.['android:name'] === name);
}

function removeByName<T extends ManifestEntry>(list: T[], name: string): T[] {
  return list.filter((entry) => entry.$?.['android:name'] !== name);
}
