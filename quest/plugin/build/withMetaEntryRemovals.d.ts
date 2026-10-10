import { AndroidConfig, ConfigPlugin } from '@expo/config-plugins';
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
/** `android:name` prefixes that only Meta Horizon OS reads. */
export declare const META_NAME_PREFIXES: readonly ["com.oculus.", "oculus.", "horizonos.", "com.meta."];
/**
 * Meta entries declared by library manifests, which a config plugin cannot
 * read. From the `viro_renderer` AAR in `@reactvision/react-viro` 3.0.2.
 */
export declare const LIBRARY_META_ENTRIES: Readonly<MetaEntries>;
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
export declare const MOBILE_ONLY_REMOVALS: Readonly<MetaEntries>;
/** The removals a flavor manifest gets: the shared Meta set, plus the mobile-only set on mobile. */
export declare function removalsForFlavor(flavor: string, entries: MetaEntries): MetaEntries;
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
export declare function isMetaOnlyName(name: string | undefined): boolean;
/**
 * Collects the Meta-only entries of a manifest: permissions, features,
 * `<application>` meta-data, and per activity its meta-data and the intent
 * filters made only of Meta categories. A filter that mixes Meta and other
 * categories is skipped, since removing it would also drop the others.
 */
export declare function collectMetaEntries(manifest: Manifest): MetaEntries;
/** Union of two collections, first-seen order. */
export declare function mergeMetaEntries(a: MetaEntries, b: MetaEntries): MetaEntries;
/**
 * Writes a `tools:node="remove"` marker into a flavor manifest for each
 * collected entry. Activity entries go on a `tools:node="merge"` copy of the
 * activity, reusing one the manifest already has. Returns true when the
 * manifest changed. Idempotent.
 */
export declare function applyMetaEntryRemovals(manifest: Manifest, entries: MetaEntries): boolean;
/**
 * Reads `app/src/main/AndroidManifest.xml` and writes the removal markers
 * into each flavor manifest in `flavors`. The pico and dual manifests are
 * edited only when they exist (core writes them); the mobile one is created
 * when missing.
 */
export declare function syncMetaEntryRemovals(platformRoot: string, flavors: readonly string[]): Promise<void>;
/**
 * Registers the finalized mod. Finalized, because the main manifest Viro
 * edits is written by the manifest base mod, and the pico manifest is
 * rewritten from scratch by a dangerous mod; both have run by then.
 */
export declare const withMetaEntryRemovals: ConfigPlugin;
export {};
//# sourceMappingURL=withMetaEntryRemovals.d.ts.map