/**
 * Single source of truth for the PICO Platform Service (PPS) Maven
 * coordinates injected into a consuming app.
 *
 * Why this file exists: every `@expo-pico/*` package that talks to PPS
 * needs the same eleven artifacts on the classpath, and Android's
 * `checkDebugDuplicateClasses` task fails the build if a class arrives
 * from two places. Rather than let each package declare what it needs,
 * `expo-pico-core` declares the whole set once, in the app module, and
 * every sibling reaches it transitively. Installing more `@expo-pico/*`
 * packages therefore cannot add a second declaration of anything.
 *
 * The coordinates and the transitive graph below were read off the
 * published artifacts on the Volcengine Maven, not inferred. See
 * `docs/PPS-ARTIFACTS.md` for the resolution dump and how to reproduce it.
 */
/** Maven group shared by every PPS artifact. */
export declare const PPS_GROUP = "com.pico.pps";
/**
 * The `com.pico.pps:pps_sdk_base` version this release pins.
 *
 * Pinning matters more than usual here: all eleven service artifacts
 * depend on `pps_sdk_base`, so a service resolved at a different version
 * drags a second `pps_sdk_base` into the graph and Gradle picks the newest,
 * silently pairing services with a base they were not compiled against.
 *
 * Why 1.1.3: `platform-service-push` 1.1.3 and `platform-service-sport`
 * 1.1.3 declare `pps_sdk_base:1.1.3` in their POMs. The 1.1.2 services
 * declare `pps_sdk_base:1.1.2`, but 1.1.2 and 1.1.3 have the same public
 * API (`javap -public` diff is empty, and so is the diff for the
 * `matrix_psf_api` they each pull in), and every `pps_sdk_base` member the
 * service bytecode references resolves in 1.1.3, so every chosen POM runs
 * against the same base.
 */
export declare const PPS_VERSION = "1.1.3";
export type PicoPlatformServiceName = 'achievement' | 'auth' | 'compliance' | 'entitlement' | 'friend' | 'iap' | 'leaderboard' | 'push' | 'social' | 'speech' | 'sport';
/** Every service artifact published under {@link PPS_GROUP}. */
export declare const PPS_ALL_SERVICES: readonly PicoPlatformServiceName[];
/**
 * The version each service artifact is pinned to: the newest stable release
 * in its `maven-metadata.xml` on the Volcengine repo, pre-releases ignored.
 *
 * `push` and `sport` are at 1.1.3. The other wrapped services stop at 1.1.2.
 * `compliance`, `entitlement` and `speech` have only ever published 1.0.0;
 * their POMs ask for `pps_sdk_base:1.0.0`, which the pin lifts to
 * {@link PPS_VERSION}. Every `pps_sdk_base` member their bytecode references
 * exists in 1.1.3. The only members removed since 1.0.0 are synthetic
 * `LoaderManager` accessors (`access$getCurrentActivity$p` and friends).
 *
 * A single version for every service is not an option: it would make the
 * full-set fallback in {@link resolvePpsServices}, or an explicit
 * `platformService.services` list, request a coordinate that was never
 * published.
 */
export declare const PPS_SERVICE_VERSIONS: Readonly<Record<PicoPlatformServiceName, string>>;
/**
 * Which service artifacts each `@expo-pico/*` package actually calls into.
 *
 * Derived from the per-service signatures in `docs/PPS-API-SURFACE.md`.
 * Packages mapped to an empty list have no PPS backing at all — `rooms`,
 * `rtc` and `storage` have no corresponding artifact on the repo, which is
 * why their native seams are marked `NOT_IN_PPS_1_0`. (Read-only room
 * listing is the one exception: it comes from the `friend` service.)
 */
export declare const PPS_SERVICES_BY_PACKAGE: Readonly<Record<string, readonly PicoPlatformServiceName[]>>;
/**
 * The version a module inside {@link PPS_GROUP} is pinned to, or
 * `undefined` for a module the pin leaves alone.
 *
 * Covers `pps_sdk_base` and the eleven services. The group also holds
 * `pps_platform_java_base`, `matrix_psf_api`, `sdk.lib.annotations` and
 * `coreservice.library`, each on its own version line. Pinning the whole
 * group would force those to a version that was never published, so the
 * pin is deliberately narrow.
 */
export declare function ppsPinnedVersion(name: string): string | undefined;
/** Whether {@link ppsPinnedVersion} pins this module. */
export declare function isPinnedPpsModule(name: string): boolean;
/**
 * Filename patterns that must never be picked up from `android/app/libs/`.
 *
 * PICO's own integration docs tell developers to drop SDK AARs into
 * `app/libs`. Anything matching one of these is already coming from Maven,
 * so letting `fileTree` package a second copy is the one reliable way to
 * hit `Duplicate class com.pico.pps.… found in modules`.
 */
export declare const PPS_LOCAL_AAR_EXCLUDES: readonly string[];
/** Resolves an npm package name to `true` when it is installed. */
export type PackageResolver = (packageName: string) => boolean;
/**
 * Work out which service artifacts a project needs.
 *
 * Order of precedence:
 *
 * 1. An explicit `platformService.services` list wins outright. Use it for
 *    the four services no package wraps yet (`compliance`, `entitlement`,
 *    `sport`, `speech`) or to trim the set by hand.
 * 2. Otherwise, the union of the services mapped to each installed
 *    `@expo-pico/*` package.
 * 3. If nothing is detected — the resolver can't see `node_modules`, or
 *    only `@expo-pico/core` is installed — fall back to the full set, so a
 *    detection miss can never turn into a `ClassNotFoundException` at
 *    runtime.
 *
 * The result is always sorted and de-duplicated: two packages that share a
 * service (`social` and `rooms` both use `friend`) contribute one line.
 */
export declare function resolvePpsServices(explicit: readonly PicoPlatformServiceName[] | null | undefined, isInstalled: PackageResolver): PicoPlatformServiceName[];
/**
 * Build a resolver backed by Node's module resolution, rooted at the
 * consuming app. Returns a resolver that reports nothing as installed when
 * `projectRoot` is unusable, which lands on the full-set fallback above.
 */
export declare function createPackageResolver(projectRoot: string): PackageResolver;
/**
 * Gradle configurations the PPS artifacts are declared on.
 *
 * `xrMode` and `buildVariant` are independent: a `pico-os5` app built as
 * `dual` still produces `mobileDebug`, `mobileRelease` and the `quest*`
 * variants. A bare `implementation` declaration lands on every one of
 * them, so the SDK is declared per flavor instead.
 *
 * `buildVariant: 'mobile'` emits `missingDimensionStrategy` rather than
 * productFlavors, so no `picoImplementation` configuration exists there
 * and the declaration stays on `implementation`.
 */
export declare function resolvePpsConfigurations(buildVariant: 'mobile' | 'pico' | 'dual'): readonly string[];
/**
 * Render the `dependencies { }` block for the app module.
 *
 * The `constraints` sub-block is what makes this safe to combine with a
 * hand-written declaration: a consumer (or a third-party plugin) that adds
 * `com.pico.pps:platform-service-auth` without a version, or at an older
 * one, resolves to its pinned version rather than landing a second copy
 * of the service and its `pps_sdk_base` on the classpath. Constraints stay
 * on `implementation` — every variant's compile classpath extends it, so
 * one declaration pins the group no matter which flavor requests it, and a
 * constraint alone puts nothing on the classpath.
 */
export declare function renderPpsDependenciesBlock(services: readonly PicoPlatformServiceName[], marker: string, configurations?: readonly string[]): string;
/**
 * Render the resolution pin for the project-level `build.gradle`.
 *
 * `constraints` in the app module governs the app module. This covers
 * every other Gradle module in the build — autolinked React Native
 * libraries included — so a PPS coordinate requested from a library
 * module lands on the same version the app packages.
 *
 * Scoped by {@link ppsPinnedVersion}: the group also carries
 * `pps_platform_java_base` (0.0.1-rc.0, its only release),
 * `sdk.lib.annotations` (0.0.1-alpha.0), `coreservice.library`
 * (2.1.0-alpha.13) and `matrix_psf_api`, which follows the version
 * `pps_sdk_base`'s POM names (1.1.3 at this pin). None of them is forced.
 */
export declare function renderPpsResolutionPin(marker: string): string;
/**
 * Render the `app/libs` drop-in block for offline / air-gapped builds.
 *
 * Kept for consumers who vendor AARs into source control, but bounded:
 * anything PPS already supplies from Maven is excluded so the two paths
 * cannot both contribute the same classes.
 *
 * Declared on the same configurations as the Maven artifacts — see
 * {@link resolvePpsConfigurations} — so a vendored PICO AAR never reaches
 * a `mobile*` or `quest*` variant.
 */
export declare function renderLocalAarBlock(marker: string, configurations?: readonly string[]): string;
declare const _default: {
    PPS_GROUP: string;
    PPS_VERSION: string;
    PPS_ALL_SERVICES: readonly PicoPlatformServiceName[];
    PPS_SERVICE_VERSIONS: Readonly<Record<PicoPlatformServiceName, string>>;
    PPS_SERVICES_BY_PACKAGE: Readonly<Record<string, readonly PicoPlatformServiceName[]>>;
    PPS_LOCAL_AAR_EXCLUDES: readonly string[];
    isPinnedPpsModule: typeof isPinnedPpsModule;
    ppsPinnedVersion: typeof ppsPinnedVersion;
    resolvePpsServices: typeof resolvePpsServices;
    resolvePpsConfigurations: typeof resolvePpsConfigurations;
    createPackageResolver: typeof createPackageResolver;
    renderPpsDependenciesBlock: typeof renderPpsDependenciesBlock;
    renderPpsResolutionPin: typeof renderPpsResolutionPin;
    renderLocalAarBlock: typeof renderLocalAarBlock;
};
export default _default;
//# sourceMappingURL=ppsArtifacts.d.ts.map