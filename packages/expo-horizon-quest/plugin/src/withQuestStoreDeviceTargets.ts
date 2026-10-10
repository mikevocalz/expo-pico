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

import type { ResolvedQuestOptions } from './types';

type Manifest = AndroidConfig.Manifest.AndroidManifest;

/** Meta-data that seeds a build's Device Targeting in the Meta Developer Dashboard. */
export const STORE_DEVICE_TARGETS_META = 'com.meta.store.defaultDeviceTargets';
/** Meta-data expo-horizon-core and react-viro write with the headset allow-list. */
export const OCULUS_SUPPORTED_DEVICES_META = 'com.oculus.supportedDevices';

/**
 * Specifiers Meta documents for `com.meta.store.defaultDeviceTargets`
 * (publish-release-channels-device-targeting). Joined with `|`.
 */
export const STORE_DEVICE_TARGET_SPECIFIERS = [
  'quest2only',
  'questproonly',
  'quest3only',
  'quest2+',
  'questpro+',
  'quest3+',
  'questpro-',
] as const;
export type StoreDeviceTargetSpecifier = (typeof STORE_DEVICE_TARGET_SPECIFIERS)[number];

/**
 * Validates and normalizes a `storeDeviceTargets` value. Returns the trimmed,
 * `|`-joined specifier string, `false` for an explicit opt-out (`false` or an
 * empty string), or `null` when unset (derive from supportedDevices).
 * Throws on any specifier outside the documented set.
 */
export function normalizeStoreDeviceTargets(
  value: string | false | null | undefined
): string | false | null {
  if (value === undefined || value === null) return null;
  if (value === false) return false;
  if (typeof value !== 'string') {
    throw new Error(
      `[expo-horizon-quest] storeDeviceTargets must be a string or false, got ${typeof value}.`
    );
  }
  if (value.trim() === '') return false;
  const parts = value.split('|').map((p) => p.trim());
  const allowed: readonly string[] = STORE_DEVICE_TARGET_SPECIFIERS;
  const unknown = parts.filter((p) => !allowed.includes(p));
  if (unknown.length > 0) {
    throw new Error(
      `[expo-horizon-quest] storeDeviceTargets has unknown specifier(s): ${unknown
        .map((p) => JSON.stringify(p))
        .join(', ')}. Use one or more of ${STORE_DEVICE_TARGET_SPECIFIERS.join(', ')}, ` +
        `joined with "|".`
    );
  }
  return [...new Set(parts)].join('|');
}

/**
 * Picks a default from the quest manifest's `com.oculus.supportedDevices`:
 * the `+` specifier for the oldest listed device family, so the Store build
 * also reaches newer devices in that line (Meta: "`quest3+` includes Quest 3
 * family, Meta VR Glasses, and future devices"). `vrglasses` alone maps to
 * `quest3+` for the same reason. Returns null when the list names no Quest 2,
 * Pro, 3-family or Meta VR Glasses device.
 */
export function deriveStoreDeviceTargets(supportedDevices: string | null): string | null {
  if (!supportedDevices) return null;
  const devices = new Set(
    supportedDevices
      .split('|')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)
  );
  if (devices.has('quest2')) return 'quest2+';
  if (devices.has('questpro')) return 'questpro+';
  if (devices.has('quest3') || devices.has('quest3s') || devices.has('vrglasses')) return 'quest3+';
  return null;
}

type MetaData = { $: { 'android:name'?: string; 'android:value'?: string } };

function applicationOf(manifest: Manifest) {
  return manifest.manifest.application?.[0] as
    | (Record<string, unknown> & { 'meta-data'?: MetaData[] })
    | undefined;
}

/** Reads `com.oculus.supportedDevices` from a parsed quest manifest. */
export function readSupportedDevices(manifest: Manifest): string | null {
  const entry = applicationOf(manifest)?.['meta-data']?.find(
    (m) => m.$?.['android:name'] === OCULUS_SUPPORTED_DEVICES_META
  );
  return entry?.$?.['android:value'] ?? null;
}

/**
 * Sets (string) or removes (null) the store device-targets meta-data in the
 * manifest's `<application>`. Every other entry is left alone. Returns true
 * when the manifest changed.
 */
export function applyStoreDeviceTargets(manifest: Manifest, value: string | null): boolean {
  const before = JSON.stringify(manifest);
  // expo-horizon-core owns the quest <application>; never invent one.
  const app = applicationOf(manifest);
  if (!app) return false;
  const kept = (app['meta-data'] ?? []).filter(
    (m) => m.$?.['android:name'] !== STORE_DEVICE_TARGETS_META
  );
  if (value !== null) {
    kept.push({ $: { 'android:name': STORE_DEVICE_TARGETS_META, 'android:value': value } });
  }
  if (kept.length > 0) app['meta-data'] = kept;
  else delete app['meta-data'];
  return JSON.stringify(manifest) !== before;
}

/**
 * Brings `app/src/quest/AndroidManifest.xml` in line with
 * `storeDeviceTargets`. The quest manifest belongs to expo-horizon-core, so
 * this never creates one: no quest flavor, nothing to target.
 */
export async function syncQuestStoreDeviceTargets(
  platformRoot: string,
  options: ResolvedQuestOptions
): Promise<void> {
  const questPath = path.join(platformRoot, 'app', 'src', 'quest', 'AndroidManifest.xml');
  if (!fs.existsSync(questPath)) return;
  const manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(questPath);
  const setting = options.storeDeviceTargets;
  let value: string | null;
  if (setting === false) value = null;
  else if (setting !== null) value = setting;
  else {
    const supported = readSupportedDevices(manifest);
    value = deriveStoreDeviceTargets(supported);
    if (value === null && supported) {
      console.warn(
        `[expo-horizon-quest] No Meta Store device targets derived from com.oculus.supportedDevices="${supported}"; ` +
          'set storeDeviceTargets to write com.meta.store.defaultDeviceTargets.'
      );
    }
  }
  if (!applyStoreDeviceTargets(manifest, value)) return;
  await AndroidConfig.Manifest.writeAndroidManifestAsync(questPath, manifest);
}

/**
 * Writes `com.meta.store.defaultDeviceTargets` into the quest flavor
 * manifest. Meta uses it to initialize the build's Device Targeting in the
 * Developer Dashboard; an `ovr-platform-util --channel "alpha:quest3+"`
 * suffix overrides it per upload. pico, dual, mobile and main never get it.
 *
 * Runs as a finalized mod for the same reason as withQuestRenderModel:
 * expo-horizon-core rewrites the quest manifest in a dangerous mod.
 */
export const withQuestStoreDeviceTargets: ConfigPlugin<ResolvedQuestOptions> = (config, options) =>
  withFinalizedMod(config, [
    'android',
    async (cfg) => {
      await syncQuestStoreDeviceTargets(cfg.modRequest.platformProjectRoot, options);
      return cfg;
    },
  ]) as typeof config;
