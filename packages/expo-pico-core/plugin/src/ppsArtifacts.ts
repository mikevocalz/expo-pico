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
export const PPS_GROUP = 'com.pico.pps';

/**
 * The PPS line this release pins.
 *
 * Pinning matters more than usual here: all eleven service artifacts
 * depend on `com.pico.pps:pps_sdk_base`, so a single service resolved at
 * a different version drags a second `pps_sdk_base` into the graph and
 * Gradle picks the newest — silently pairing services with a base they
 * were not compiled against.
 */
export const PPS_VERSION = '1.0.0';

export type PicoPlatformServiceName =
  | 'achievement'
  | 'auth'
  | 'compliance'
  | 'entitlement'
  | 'friend'
  | 'iap'
  | 'leaderboard'
  | 'push'
  | 'social'
  | 'speech'
  | 'sport';

/** Every service artifact published under {@link PPS_GROUP}. */
export const PPS_ALL_SERVICES: readonly PicoPlatformServiceName[] = [
  'achievement',
  'auth',
  'compliance',
  'entitlement',
  'friend',
  'iap',
  'leaderboard',
  'push',
  'social',
  'speech',
  'sport',
];

/**
 * Which service artifacts each `@expo-pico/*` package actually calls into.
 *
 * Derived from the per-service signatures in `docs/PPS-API-SURFACE.md`.
 * Packages mapped to an empty list have no PPS backing at all — `rooms`,
 * `rtc` and `storage` have no corresponding artifact on the repo, which is
 * why their native seams are marked `NOT_IN_PPS_1_0`. (Read-only room
 * listing is the one exception: it comes from the `friend` service.)
 */
export const PPS_SERVICES_BY_PACKAGE: Readonly<Record<string, readonly PicoPlatformServiceName[]>> =
  {
    '@expo-pico/account': ['auth'],
    '@expo-pico/achievements': ['achievement'],
    '@expo-pico/app-kit': [],
    '@expo-pico/core': [],
    '@expo-pico/iap': ['iap'],
    '@expo-pico/leaderboards': ['leaderboard'],
    '@expo-pico/notifications': ['push'],
    '@expo-pico/rooms': ['friend'],
    '@expo-pico/rtc': [],
    '@expo-pico/social': ['social', 'friend'],
    '@expo-pico/spatial': [],
    '@expo-pico/storage': [],
    '@expo-pico/subscription': ['iap'],
  };

/**
 * Modules inside {@link PPS_GROUP} that {@link PPS_VERSION} applies to.
 *
 * The group also holds `pps_platform_java_base`, `matrix_psf_api`,
 * `sdk.lib.annotations` and `coreservice.library`, each on its own
 * independent version line. Pinning the whole group would force those to
 * a version that was never published, so the pin is deliberately narrow.
 */
export function isPinnedPpsModule(name: string): boolean {
  return name.startsWith('platform-service-') || name === 'pps_sdk_base';
}

/**
 * Filename patterns that must never be picked up from `android/app/libs/`.
 *
 * PICO's own integration docs tell developers to drop SDK AARs into
 * `app/libs`. Anything matching one of these is already coming from Maven,
 * so letting `fileTree` package a second copy is the one reliable way to
 * hit `Duplicate class com.pico.pps.… found in modules`.
 */
export const PPS_LOCAL_AAR_EXCLUDES: readonly string[] = [
  'platform-service-*.aar',
  'platform-service-*.jar',
  'pps_sdk_base*.aar',
  'pps_sdk_base*.jar',
  'pps_platform_java_base*.aar',
  'matrix_psf_api*.aar',
  'coreservice.library*.aar',
  'sdk.lib.annotations*.jar',
];

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
export function resolvePpsServices(
  explicit: readonly PicoPlatformServiceName[] | null | undefined,
  isInstalled: PackageResolver
): PicoPlatformServiceName[] {
  if (explicit && explicit.length > 0) {
    return dedupe(explicit);
  }

  const detected = new Set<PicoPlatformServiceName>();
  for (const [packageName, services] of Object.entries(PPS_SERVICES_BY_PACKAGE)) {
    if (!isInstalled(packageName)) continue;
    for (const service of services) {
      detected.add(service);
    }
  }

  if (detected.size === 0) {
    return [...PPS_ALL_SERVICES];
  }
  return dedupe([...detected]);
}

/**
 * Build a resolver backed by Node's module resolution, rooted at the
 * consuming app. Returns a resolver that reports nothing as installed when
 * `projectRoot` is unusable, which lands on the full-set fallback above.
 */
export function createPackageResolver(projectRoot: string): PackageResolver {
  return (packageName: string) => {
    try {
      require.resolve(`${packageName}/package.json`, { paths: [projectRoot] });
      return true;
    } catch {
      return false;
    }
  };
}

/**
 * Render the `dependencies { }` block for the app module.
 *
 * The `constraints` sub-block is what makes this safe to combine with a
 * hand-written declaration: a consumer (or a third-party plugin) that adds
 * `com.pico.pps:platform-service-auth` without a version, or at an older
 * one, resolves to {@link PPS_VERSION} rather than landing a second copy
 * of the service and its `pps_sdk_base` on the classpath.
 */
export function renderPpsDependenciesBlock(
  services: readonly PicoPlatformServiceName[],
  marker: string,
  version: string = PPS_VERSION
): string {
  const ordered = dedupe(services);
  const constraintLines = [
    `        implementation "${PPS_GROUP}:pps_sdk_base:${version}"`,
    ...PPS_ALL_SERVICES.map(
      (svc) => `        implementation "${PPS_GROUP}:platform-service-${svc}:${version}"`
    ),
  ].join('\n');
  const implementationLines = ordered
    .map((svc) => `    implementation "${PPS_GROUP}:platform-service-${svc}:${version}"`)
    .join('\n');

  return `
${marker}
//
// Declared once, here. No sibling @expo-pico/* package declares a
// com.pico.pps coordinate of its own, so installing more of them never
// produces a second declaration of the same artifact.
//
// Every service below depends on com.pico.pps:pps_sdk_base. The
// constraints block pins the whole pinned set — including services this
// app does not use — so that a declaration added anywhere else resolves
// to ${version} instead of dragging a second SDK onto the classpath.
dependencies {
    constraints {
${constraintLines}
    }

${implementationLines}
}
`;
}

/**
 * Render the resolution pin for the project-level `build.gradle`.
 *
 * `constraints` in the app module governs the app module. This covers
 * every other Gradle module in the build — autolinked React Native
 * libraries included — so a PPS coordinate requested from a library
 * module lands on the same version the app packages.
 *
 * Scoped by {@link isPinnedPpsModule}: the group also carries
 * `pps_platform_java_base` (0.0.1-rc.0), `sdk.lib.annotations`
 * (0.0.1-alpha.0), `matrix_psf_api` (1.0.0) and `coreservice.library`
 * (2.1.0-alpha.13), none of which have a ${PPS_VERSION} release.
 */
export function renderPpsResolutionPin(marker: string, version: string = PPS_VERSION): string {
  return `
${marker}
allprojects {
    configurations.configureEach {
        resolutionStrategy.eachDependency { details ->
            def requested = details.requested
            if (requested.group == "${PPS_GROUP}" &&
                (requested.name.startsWith("platform-service-") || requested.name == "pps_sdk_base")) {
                details.useVersion "${version}"
                details.because "expo-pico-core pins the PICO Platform Service SDK to a single version"
            }
        }
    }
}
`;
}

/**
 * Render the `app/libs` drop-in block for offline / air-gapped builds.
 *
 * Kept for consumers who vendor AARs into source control, but bounded:
 * anything PPS already supplies from Maven is excluded so the two paths
 * cannot both contribute the same classes.
 */
export function renderLocalAarBlock(marker: string): string {
  const excludes = PPS_LOCAL_AAR_EXCLUDES.map((pattern) => `'${pattern}'`).join(', ');
  return `
${marker}
//
// Offline / air-gapped fallback. PICO's integration docs tell you to drop
// SDK AARs here, so the PPS artifacts resolved from Maven above are
// excluded by name — a local copy alongside the Maven one is what
// produces "Duplicate class com.pico.pps.… found in modules".
dependencies {
    implementation fileTree(
        dir: 'libs',
        include: ['*.aar', '*.jar'],
        exclude: [${excludes}]
    )
}
`;
}

function dedupe(services: readonly PicoPlatformServiceName[]): PicoPlatformServiceName[] {
  return [...new Set(services)].sort();
}

export default {
  PPS_GROUP,
  PPS_VERSION,
  PPS_ALL_SERVICES,
  PPS_SERVICES_BY_PACKAGE,
  PPS_LOCAL_AAR_EXCLUDES,
  isPinnedPpsModule,
  resolvePpsServices,
  createPackageResolver,
  renderPpsDependenciesBlock,
  renderPpsResolutionPin,
  renderLocalAarBlock,
};
