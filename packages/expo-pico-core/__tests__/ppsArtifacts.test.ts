import {
  PPS_ALL_SERVICES,
  PPS_GROUP,
  PPS_LOCAL_AAR_EXCLUDES,
  PPS_SERVICES_BY_PACKAGE,
  PPS_VERSION,
  isPinnedPpsModule,
  renderLocalAarBlock,
  renderPpsDependenciesBlock,
  renderPpsResolutionPin,
  resolvePpsServices,
} from '../plugin/src/ppsArtifacts';

const DEPS_MARKER = '// expo-pico-core: PICO Platform Service SDK (com.pico.pps:*) deps';
const PIN_MARKER = '// expo-pico-core: single-version pin for com.pico.pps:*';
const LIBS_MARKER = '// expo-pico-core: auto-include app/libs/*.aar (PICO Platform SDK)';

const installedResolver = (installed: string[]) => (pkg: string) => installed.includes(pkg);

describe('resolvePpsServices', () => {
  it('derives the union of services from the installed packages', () => {
    const services = resolvePpsServices(
      null,
      installedResolver(['@expo-pico/core', '@expo-pico/account', '@expo-pico/achievements'])
    );
    expect(services).toEqual(['achievement', 'auth']);
  });

  it('emits a shared service once when two packages both need it', () => {
    // social maps to [social, friend]; rooms maps to [friend].
    const services = resolvePpsServices(
      null,
      installedResolver(['@expo-pico/social', '@expo-pico/rooms'])
    );
    expect(services).toEqual(['friend', 'social']);
    expect(services.filter((s) => s === 'friend')).toHaveLength(1);
  });

  it('does not grow the set when a package with no PPS backing is added', () => {
    const before = resolvePpsServices(null, installedResolver(['@expo-pico/account']));
    const after = resolvePpsServices(
      null,
      installedResolver([
        '@expo-pico/account',
        '@expo-pico/rtc',
        '@expo-pico/storage',
        '@expo-pico/spatial',
        '@expo-pico/app-kit',
      ])
    );
    expect(after).toEqual(before);
  });

  it('falls back to the full set when nothing is detected', () => {
    expect(resolvePpsServices(null, () => false)).toEqual([...PPS_ALL_SERVICES]);
  });

  it('falls back to the full set when only core is installed', () => {
    // core wraps no PPS service of its own — a detection result of zero
    // must not silently ship an app with an empty classpath.
    expect(resolvePpsServices(null, installedResolver(['@expo-pico/core']))).toEqual([
      ...PPS_ALL_SERVICES,
    ]);
  });

  it('lets an explicit list win, de-duplicated and sorted', () => {
    const services = resolvePpsServices(
      ['sport', 'auth', 'sport'],
      installedResolver(['@expo-pico/achievements'])
    );
    expect(services).toEqual(['auth', 'sport']);
  });

  it('maps every package to services that actually exist', () => {
    for (const [pkg, services] of Object.entries(PPS_SERVICES_BY_PACKAGE)) {
      for (const service of services) {
        expect(PPS_ALL_SERVICES).toContain(service);
      }
      expect(pkg.startsWith('@expo-pico/')).toBe(true);
    }
  });
});

describe('renderPpsDependenciesBlock', () => {
  const block = renderPpsDependenciesBlock(['auth', 'friend', 'iap', 'social'], DEPS_MARKER);

  it('declares each requested service exactly once', () => {
    for (const service of ['auth', 'friend', 'iap', 'social']) {
      const line = `    implementation "${PPS_GROUP}:platform-service-${service}:${PPS_VERSION}"`;
      expect(block.split('\n').filter((l) => l === line)).toHaveLength(1);
    }
  });

  it('constrains every service plus the shared base, not just the ones used', () => {
    for (const service of PPS_ALL_SERVICES) {
      expect(block).toContain(
        `        implementation "${PPS_GROUP}:platform-service-${service}:${PPS_VERSION}"`
      );
    }
    expect(block).toContain(`        implementation "${PPS_GROUP}:pps_sdk_base:${PPS_VERSION}"`);
  });

  it('carries the idempotency marker so a repeat prebuild skips it', () => {
    expect(block).toContain(DEPS_MARKER);
  });

  it('de-duplicates a service passed twice', () => {
    const dupes = renderPpsDependenciesBlock(['auth', 'auth', 'auth'], DEPS_MARKER);
    const line = `    implementation "${PPS_GROUP}:platform-service-auth:${PPS_VERSION}"`;
    expect(dupes.split('\n').filter((l) => l === line)).toHaveLength(1);
  });
});

describe('renderPpsResolutionPin', () => {
  const pin = renderPpsResolutionPin(PIN_MARKER);

  it('scopes the pin to the group', () => {
    expect(pin).toContain(`requested.group == "${PPS_GROUP}"`);
  });

  it('forces the pinned version', () => {
    expect(pin).toContain(`details.useVersion "${PPS_VERSION}"`);
  });

  it('reaches every module in the build, not just the app', () => {
    expect(pin).toContain('allprojects {');
    expect(pin).toContain('configurations.configureEach');
  });

  it('leaves the independently-versioned modules in the group alone', () => {
    // The group also holds pps_platform_java_base (0.0.1-rc.0),
    // sdk.lib.annotations (0.0.1-alpha.0), matrix_psf_api (1.0.0) and
    // coreservice.library (2.1.0-alpha.13). Forcing those to PPS_VERSION
    // would ask Gradle for a version that was never published.
    expect(isPinnedPpsModule('platform-service-auth')).toBe(true);
    expect(isPinnedPpsModule('pps_sdk_base')).toBe(true);
    expect(isPinnedPpsModule('pps_platform_java_base')).toBe(false);
    expect(isPinnedPpsModule('sdk.lib.annotations')).toBe(false);
    expect(isPinnedPpsModule('matrix_psf_api')).toBe(false);
    expect(isPinnedPpsModule('coreservice.library')).toBe(false);
  });
});

describe('renderLocalAarBlock', () => {
  const block = renderLocalAarBlock(LIBS_MARKER);

  it('still picks up genuinely vendored artifacts', () => {
    expect(block).toContain("include: ['*.aar', '*.jar']");
  });

  it('excludes every artifact the maven declaration already supplies', () => {
    for (const pattern of PPS_LOCAL_AAR_EXCLUDES) {
      expect(block).toContain(`'${pattern}'`);
    }
  });

  it('covers each resolved PPS artifact name by at least one exclude', () => {
    // Names taken from a real `gradle` resolution of the eleven services.
    const resolved = [
      'platform-service-auth-1.0.0.aar',
      'platform-service-iap-1.0.0.aar',
      'pps_sdk_base-1.0.0.aar',
      'pps_platform_java_base-0.0.1-rc.0.aar',
      'matrix_psf_api-1.0.0.aar',
      'coreservice.library-2.1.0-alpha.13.aar',
      'sdk.lib.annotations-0.0.1-alpha.0.jar',
    ];
    const toRegExp = (glob: string) =>
      new RegExp(`^${glob.replace(/[.]/g, '\\.').replace(/\*/g, '.*')}$`);
    for (const name of resolved) {
      expect(PPS_LOCAL_AAR_EXCLUDES.some((g) => toRegExp(g).test(name))).toBe(true);
    }
  });

  it('does not exclude an unrelated vendored library', () => {
    const toRegExp = (glob: string) =>
      new RegExp(`^${glob.replace(/[.]/g, '\\.').replace(/\*/g, '.*')}$`);
    expect(PPS_LOCAL_AAR_EXCLUDES.some((g) => toRegExp(g).test('my-vendor-lib.jar'))).toBe(false);
    expect(PPS_LOCAL_AAR_EXCLUDES.some((g) => toRegExp(g).test('unity-classes.jar'))).toBe(false);
  });
});
