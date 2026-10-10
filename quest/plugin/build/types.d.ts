/**
 * Options for the Meta Horizon `quest` flavor, set on the `expo-horizon-core`
 * plugin entry next to its own options (`supportedDevices`, panel size, ...).
 * Quest and Meta VR Glasses share this flavor and this configuration.
 *
 * @see {@linkcode resolveQuestOptions}
 */
export interface QuestOptions {
    /**
     * Link the Meta VR Layout SDK (`@metavr/layout-compat` and
     * `@metavr/layout-window-compat`) into the `quest` flavor so the app can
     * open Horizon OS spatial windows around its main panel. The windows
     * themselves are laid out by `@viro-external/meta-layout`.
     *
     * Writes the MetaVRX BOM and both React Native artifacts as
     * `questImplementation`, strips the SDK from every other flavor's classpath
     * (its autolinked projects declare it as `api`, and the window AAR adds
     * `horizonos.permission.MANAGE_APP_VOLUMETRIC_WINDOWS`), and gives the other
     * flavors empty stand-ins for the two ReactPackages the generated
     * PackageList instantiates. Both npm packages must be direct app
     * dependencies. JS must only render Meta's components when
     * `isHorizonBuild` is true.
     *
     * @default false
     */
    metaLayoutSdk?: boolean;
    /**
     * Default Meta Store device targeting, written as
     * `com.meta.store.defaultDeviceTargets` in `app/src/quest/AndroidManifest.xml`.
     * Specifiers, joined with `|`: `quest2only`, `questproonly`, `quest3only`,
     * `quest2+`, `questpro+`, `quest3+`, `questpro-`. Anything else throws at
     * prebuild. `quest3+` covers the Quest 3 family, Meta VR Glasses and future
     * devices. Set `false` or `''` to remove the entry.
     *
     * @default derived from the quest manifest's `com.oculus.supportedDevices`
     */
    storeDeviceTargets?: string | false;
    /**
     * Permissions stripped from the `quest` flavor only, as
     * `<uses-permission tools:node="remove"/>` entries in the quest manifest.
     *
     * @default []
     */
    questRemovePermissions?: string[];
    /**
     * `<uses-feature>` names stripped from the `quest` flavor only.
     *
     * @default []
     */
    questRemoveFeatures?: string[];
    /**
     * Maven `group:module` coordinates excluded from the `quest` compile and
     * runtime classpaths only. Anything else throws at prebuild.
     *
     * @default []
     */
    questExcludeDependencies?: string[];
    /**
     * Stage the patched Viro renderer (`libviro_renderer.so`, floor-level
     * origin and controller meshes) and `controller_neutral.glb` into the
     * `quest` flavor, and declare Meta's RENDER_MODEL permission and feature
     * there. arm64-v8a only.
     *
     * @default false
     */
    viroRendererOverlay?: boolean;
    /**
     * Limit the `quest` flavor to `arm64-v8a`. Every Quest and Meta VR Glasses
     * device is 64-bit ARM.
     *
     * @default true
     */
    ndkAbiFilters?: boolean;
}
/**
 * {@linkcode QuestOptions} after validation and defaults.
 *
 * @see {@linkcode resolveQuestOptions}
 */
export interface ResolvedQuestOptions {
    metaLayoutSdk: boolean;
    /** Validated specifiers; `false` removes the entry; `null` derives it. */
    storeDeviceTargets: string | false | null;
    questRemovePermissions: string[];
    questRemoveFeatures: string[];
    questExcludeDependencies: string[];
    viroRendererOverlay: boolean;
    ndkAbiFilters: boolean;
}
/** The {@linkcode QuestOptions} keys, for splitting a combined plugin entry. */
export declare const QUEST_OPTION_NAMES: readonly ["metaLayoutSdk", "storeDeviceTargets", "questRemovePermissions", "questRemoveFeatures", "questExcludeDependencies", "viroRendererOverlay", "ndkAbiFilters"];
/**
 * Validates {@linkcode QuestOptions} and fills defaults.
 *
 * @throws when `storeDeviceTargets` or `questExcludeDependencies` holds a
 * value Meta or Gradle would reject
 */
export declare function resolveQuestOptions(options?: QuestOptions): ResolvedQuestOptions;
//# sourceMappingURL=types.d.ts.map