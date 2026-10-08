import { AndroidConfig, ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
type Manifest = AndroidConfig.Manifest.AndroidManifest;
/** Meta-data that seeds a build's Device Targeting in the Meta Developer Dashboard. */
export declare const STORE_DEVICE_TARGETS_META = "com.meta.store.defaultDeviceTargets";
/** Meta-data expo-horizon-core and react-viro write with the headset allow-list. */
export declare const OCULUS_SUPPORTED_DEVICES_META = "com.oculus.supportedDevices";
/**
 * Specifiers Meta documents for `com.meta.store.defaultDeviceTargets`
 * (publish-release-channels-device-targeting). Joined with `|`.
 */
export declare const STORE_DEVICE_TARGET_SPECIFIERS: readonly ["quest2only", "questproonly", "quest3only", "quest2+", "questpro+", "quest3+", "questpro-"];
export type StoreDeviceTargetSpecifier = (typeof STORE_DEVICE_TARGET_SPECIFIERS)[number];
/**
 * Validates and normalizes a `storeDeviceTargets` value. Returns the trimmed,
 * `|`-joined specifier string, `false` for an explicit opt-out (`false` or an
 * empty string), or `null` when unset (derive from supportedDevices).
 * Throws on any specifier outside the documented set.
 */
export declare function normalizeStoreDeviceTargets(value: string | false | null | undefined): string | false | null;
/**
 * Picks a default from the quest manifest's `com.oculus.supportedDevices`:
 * the `+` specifier for the oldest listed headset family, so the Store build
 * also reaches newer devices in that line (Meta: "`quest3+` includes Quest 3
 * family, Meta VR Glasses, and future devices"). Returns null when the list
 * names no Quest 2, Pro or 3-family device.
 */
export declare function deriveStoreDeviceTargets(supportedDevices: string | null): string | null;
/** Reads `com.oculus.supportedDevices` from a parsed quest manifest. */
export declare function readSupportedDevices(manifest: Manifest): string | null;
/**
 * Sets (string) or removes (null) the store device-targets meta-data in the
 * manifest's `<application>`. Every other entry is left alone. Returns true
 * when the manifest changed.
 */
export declare function applyStoreDeviceTargets(manifest: Manifest, value: string | null): boolean;
/**
 * Brings `app/src/quest/AndroidManifest.xml` in line with
 * `storeDeviceTargets`. The quest manifest belongs to expo-horizon-core, so
 * this never creates one: no quest flavor, nothing to target.
 */
export declare function syncQuestStoreDeviceTargets(platformRoot: string, options: ResolvedPicoOptions): Promise<void>;
/**
 * Writes `com.meta.store.defaultDeviceTargets` into the quest flavor
 * manifest. Meta uses it to initialize the build's Device Targeting in the
 * Developer Dashboard; an `ovr-platform-util --channel "alpha:quest3+"`
 * suffix overrides it per upload. pico, dual, mobile and main never get it.
 *
 * Runs as a finalized mod for the same reason as withQuestRenderModel:
 * expo-horizon-core rewrites the quest manifest in a dangerous mod.
 */
export declare const withQuestStoreDeviceTargets: ConfigPlugin<ResolvedPicoOptions>;
export {};
//# sourceMappingURL=withQuestStoreDeviceTargets.d.ts.map