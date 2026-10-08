import { AndroidConfig, ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Meta VR Layout SDK, linked into the `quest` flavor only.
 *
 * Meta's setup (meta-vr-layout-sdk, 2026-08-27) is three Gradle lines plus
 * React Native autolinking of `@metavr/layout-compat` and
 * `@metavr/layout-window-compat`. Followed literally, every flavor would get
 * the SDK:
 *
 *  - Each npm package autolinks an Android library project that declares its
 *    AAR as `api(...)`, so `pico` and `mobile` inherit it transitively. The
 *    window AAR's manifest adds
 *    `horizonos.permission.MANAGE_APP_VOLUMETRIC_WINDOWS` and Horizon OS SDK
 *    declarations, which have no business in a PICO or phone APK.
 *  - The generated `PackageList` (main source set) calls
 *    `new SpatialScenePackage()` / `new SpatialWindowPackage()`, so a flavor
 *    without the AAR does not compile.
 *
 * The library projects cannot simply be unlinked: the AAR classes extend
 * codegen output (`NativeSpatialSceneModuleSpec`,
 * `SpatialWindowViewManagerInterface`) that only their autolinked projects
 * generate, and the C++ component descriptor comes from the same place. So
 * this keeps autolinking and instead:
 *
 *  1. declares the BOM and both artifacts as `questImplementation`;
 *  2. excludes `com.meta.metavrx.layout` from every non-quest compile and
 *     runtime classpath, which drops the transitive `api` AARs there;
 *  3. adds a stub source set to every non-quest flavor with two empty
 *     `ReactPackage`s under the vendor class names, so `PackageList` compiles
 *     and registers nothing;
 *  4. lists both library projects in the main manifest's
 *     `tools:overrideLibrary`. They declare minSdk 29, and a phone flavor
 *     below that fails the manifest merger. Off quest they carry only codegen
 *     specs and an autolink placeholder that nothing calls, so the override
 *     cannot reach code that needs API 29.
 *
 * JS must not render Meta's components on those flavors: the codegen'd
 * `SpatialWindowView` descriptor exists everywhere, but its view manager only
 * exists on quest. The example's `src/layout/metaWindows.ts` gates on
 * `isHorizonBuild`.
 */
export declare const META_LAYOUT_GRADLE_MARKER = "// expo-pico-core: Meta VR Layout SDK (quest only)";
export declare const METAVRX_BOM = "com.meta.metavrx:metavrx-bom:1.2026.0.0";
export declare const META_LAYOUT_GROUP = "com.meta.metavrx.layout";
export declare const META_LAYOUT_ARTIFACTS: readonly ["com.meta.metavrx.layout:layout-react-compat", "com.meta.metavrx.layout:layout-window-react-compat"];
/** Source dir, relative to `android/app`, added to every non-quest flavor. */
export declare const META_LAYOUT_STUB_DIR = "src/metaLayoutStub/java";
/** The two ReactPackage classes the generated PackageList instantiates. */
export declare const META_LAYOUT_STUB_CLASSES: readonly ["metavrx.layout.react.SpatialScenePackage", "metavrx.layout.window.react.SpatialWindowPackage"];
/** Namespaces of the two autolinked library projects (their build.gradle.kts). */
export declare const META_LAYOUT_LIBRARY_NAMESPACES: readonly ["metavrx.layout.react.cxx", "metavrx.layout.window.react.cxx"];
type Manifest = AndroidConfig.Manifest.AndroidManifest;
/**
 * Adds (enabled) or removes (disabled) the library namespaces in
 * `<uses-sdk tools:overrideLibrary>`, keeping any other entries. Returns true
 * when the manifest changed.
 */
export declare function applyMetaLayoutOverrideLibrary(manifest: Manifest, enabled: boolean): boolean;
export declare function renderMetaLayoutGradleBlock(): string;
/** Removes a previously written block, so turning the option off sticks. */
export declare function stripMetaLayoutGradleBlock(contents: string): string;
/** Returns app/build.gradle with exactly one current block, or none. */
export declare function applyMetaLayoutGradle(contents: string, enabled: boolean): string;
export declare function renderStubPackage(fqcn: string): string;
/** Writes (enabled) or removes (disabled) the stub source set under `android/app`. */
export declare function syncMetaLayoutStubs(appRoot: string, enabled: boolean): void;
export declare const withQuestMetaLayout: ConfigPlugin<ResolvedPicoOptions>;
export {};
//# sourceMappingURL=withQuestMetaLayout.d.ts.map