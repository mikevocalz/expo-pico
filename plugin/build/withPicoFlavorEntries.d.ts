import { AndroidConfig, ConfigPlugin } from '@expo/config-plugins';
type ConfigLike = Parameters<ConfigPlugin>[0];
type Manifest = AndroidConfig.Manifest.AndroidManifest;
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
export declare function getPicoFlavorManifestState(config: ConfigLike): PicoFlavorManifestState;
/** Called by `withPico` when it writes a pico (and dual) flavor manifest. */
export declare function markPicoFlavorPresent(config: ConfigLike): void;
export declare function resolvePicoManifestRoute(config: ConfigLike): PicoManifestRoute;
/**
 * Declares a PICO-only `<uses-permission>`, routed per
 * {@link PicoManifestRoute}. The quest flavor never gets it.
 */
export declare const withPicoFlavorPermission: ConfigPlugin<string>;
/**
 * Declares a PICO-only `<uses-feature>`, routed like
 * {@link withPicoFlavorPermission}. When several plugins declare the same
 * feature, it is required if any of them asks for `required: true`, so the
 * result does not depend on plugin order.
 */
export declare const withPicoFlavorFeature: ConfigPlugin<{
    name: string;
    required?: boolean;
}>;
/**
 * Declares PICO-only `<application>` meta-data, routed like
 * {@link withPicoFlavorPermission}; on the `pico-flavor` route `mobileFlavor`
 * adds the mobile flavor manifest. A later declaration of the same name
 * replaces the value on the `main` and `mobile-flavor` routes. In the pico
 * flavor manifest, an entry core already wrote (such as `pvr.app.type` from
 * `appType`) is kept.
 */
export declare const withPicoFlavorMetaData: ConfigPlugin<{
    name: string;
    value: string;
    mobileFlavor?: boolean;
}>;
/**
 * Writes the recorded entries into the pico flavor manifest. Entries already
 * present (for example a feature core emits itself) are left as they are.
 */
export declare function applyPicoFlavorEntries(manifest: Manifest, state: PicoFlavorManifestState): Manifest;
/**
 * Brings the mobile flavor manifest in line with the route: upserts the
 * entries it should carry and removes any other PICO entry (`com.picovr.*` /
 * `com.pico.*` permissions, `pico.*` features, `pvr.*` / `com.pico.*`
 * meta-data), so a value left by an older prebuild does not survive.
 * Returns true when the manifest changed.
 */
export declare function applyMobileFlavorEntries(manifest: Manifest, state: PicoFlavorManifestState, route: PicoManifestRoute): boolean;
/**
 * Registers, once per config, the mod that maintains
 * `android/app/src/mobile/AndroidManifest.xml`. It creates the file only when
 * there is something to write, and otherwise only edits an existing one.
 */
export declare const withPicoMobileFlavorManifest: ConfigPlugin;
export {};
//# sourceMappingURL=withPicoFlavorEntries.d.ts.map