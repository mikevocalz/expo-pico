import * as fs from 'fs';
import * as path from 'path';

import {
  PPS_ALL_SERVICES,
  PPS_GROUP,
  PPS_LOCAL_AAR_EXCLUDES,
  PPS_SERVICE_VERSIONS,
  PPS_SERVICES_BY_PACKAGE,
  PPS_VERSION,
  isPinnedPpsModule,
  ppsPinnedVersion,
  renderLocalAarBlock,
  resolvePpsConfigurations,
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
    for (const service of ['auth', 'friend', 'iap', 'social'] as const) {
      const line = `    implementation "${PPS_GROUP}:platform-service-${service}:${PPS_SERVICE_VERSIONS[service]}"`;
      expect(block.split('\n').filter((l) => l === line)).toHaveLength(1);
    }
  });

  it('constrains every service plus the shared base, not just the ones used', () => {
    for (const service of PPS_ALL_SERVICES) {
      expect(block).toContain(
        `        implementation "${PPS_GROUP}:platform-service-${service}:${PPS_SERVICE_VERSIONS[service]}"`
      );
    }
    expect(block).toContain(`        implementation "${PPS_GROUP}:pps_sdk_base:${PPS_VERSION}"`);
  });

  it('carries the idempotency marker so a repeat prebuild skips it', () => {
    expect(block).toContain(DEPS_MARKER);
  });

  it('de-duplicates a service passed twice', () => {
    const dupes = renderPpsDependenciesBlock(['auth', 'auth', 'auth'], DEPS_MARKER);
    const line = `    implementation "${PPS_GROUP}:platform-service-auth:${PPS_SERVICE_VERSIONS.auth}"`;
    expect(dupes.split('\n').filter((l) => l === line)).toHaveLength(1);
  });
});

describe('per-flavor PPS declarations', () => {
  it('keeps the SDK on the pico and dual flavors only', () => {
    expect(resolvePpsConfigurations('pico')).toEqual(['picoImplementation']);
    expect(resolvePpsConfigurations('dual')).toEqual(['picoImplementation', 'dualImplementation']);
    expect(resolvePpsConfigurations('mobile')).toEqual(['implementation']);
  });

  it('never declares a service on bare implementation when flavors exist', () => {
    const block = renderPpsDependenciesBlock(
      ['achievement'],
      DEPS_MARKER,
      resolvePpsConfigurations('pico')
    );
    expect(block).toContain(
      `    picoImplementation "${PPS_GROUP}:platform-service-achievement:${PPS_SERVICE_VERSIONS.achievement}"`
    );
    expect(block).not.toContain(
      `\n    implementation "${PPS_GROUP}:platform-service-achievement:${PPS_SERVICE_VERSIONS.achievement}"`
    );
  });

  it('scopes vendored AARs to the same flavors', () => {
    const block = renderLocalAarBlock(LIBS_MARKER, resolvePpsConfigurations('pico'));
    expect(block).toContain('    picoImplementation fileTree(');
    expect(block).not.toContain('    implementation fileTree(');
  });
});

describe('renderPpsResolutionPin', () => {
  const pin = renderPpsResolutionPin(PIN_MARKER);

  it('scopes the pin to the group', () => {
    expect(pin).toContain(`requested.group == "${PPS_GROUP}"`);
    expect(pin).not.toContain('startsWith("platform-service-")');
  });

  it('forces each pinned module to its own version', () => {
    expect(pin).toContain('details.useVersion pinned');
    expect(pin).toContain(`"pps_sdk_base": "${PPS_VERSION}",`);
    for (const service of PPS_ALL_SERVICES) {
      expect(pin).toContain(`"platform-service-${service}": "${PPS_SERVICE_VERSIONS[service]}",`);
    }
  });

  it('reaches every module in the build, not just the app', () => {
    expect(pin).toContain('allprojects {');
    expect(pin).toContain('configurations.configureEach');
  });

  it('leaves the independently-versioned modules in the group alone', () => {
    // The group also holds pps_platform_java_base (0.0.1-rc.0, its only
    // release), sdk.lib.annotations (0.0.1-alpha.0), coreservice.library
    // (2.1.0-alpha.13) and matrix_psf_api, which follows pps_sdk_base's POM.
    // Forcing those to PPS_VERSION could ask Gradle for a version that was
    // never published.
    expect(isPinnedPpsModule('platform-service-auth')).toBe(true);
    expect(isPinnedPpsModule('pps_sdk_base')).toBe(true);
    expect(isPinnedPpsModule('pps_platform_java_base')).toBe(false);
    expect(isPinnedPpsModule('sdk.lib.annotations')).toBe(false);
    expect(isPinnedPpsModule('matrix_psf_api')).toBe(false);
    expect(isPinnedPpsModule('coreservice.library')).toBe(false);
    expect(isPinnedPpsModule('platform-service-unknown')).toBe(false);
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
      'platform-service-auth-1.1.2.aar',
      'platform-service-push-1.1.3.aar',
      'platform-service-compliance-1.0.0.aar',
      'pps_sdk_base-1.1.3.aar',
      'pps_platform_java_base-0.0.1-rc.0.aar',
      'matrix_psf_api-1.1.3.aar',
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

describe('pinned PPS versions', () => {
  // __tests__/fixtures/pps/ holds verbatim copies of the Volcengine repo
  // (https://artifact.bytedance.com/repository/Volcengine/com/pico/pps/),
  // fetched 2026-11-04:
  //   metadata/<artifact>.xml        <artifact>/maven-metadata.xml
  //   pom/<artifact>-<version>.pom   the POM of each pinned coordinate
  // maven-metadata.xml's <release> and <latest> are often pre-releases
  // (platform-service-iap says 1.1.3-alpha.0), so the newest stable release is
  // taken from <versions>. The POM is what shows a coordinate was published.
  // To refresh after a PICO release, re-download both and update the pins.
  const FIXTURES = path.join(__dirname, 'fixtures/pps');
  const read = (...parts: string[]) => fs.readFileSync(path.join(FIXTURES, ...parts), 'utf8');
  const tag = (xml: string, name: string) =>
    [...xml.matchAll(new RegExp(`<${name}>([^<]+)</${name}>`, 'g'))].map((m) => m[1]);
  const STABLE = /^\d+\.\d+\.\d+$/;
  const byVersion = (a: string, b: string) => {
    const [x, y] = [a, b].map((v) => v.split('.').map(Number));
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  };
  const PINNED = ['pps_sdk_base', ...PPS_ALL_SERVICES.map((s) => `platform-service-${s}`)];
  const stableVersions = (name: string) =>
    tag(read('metadata', `${name}.xml`), 'version').filter((v) => STABLE.test(v));
  const pom = (name: string, version: string) => read('pom', `${name}-${version}.pom`);
  // The pps_sdk_base version a service POM asks for.
  const baseInPom = (xml: string) =>
    xml.match(/<artifactId>pps_sdk_base<\/artifactId>\s*<version>([^<]+)<\/version>/)?.[1];

  it('has a metadata fixture for every pinned module and nothing else', () => {
    const files = fs
      .readdirSync(path.join(FIXTURES, 'metadata'))
      .map((f) => f.replace(/\.xml$/, ''));
    expect(files.sort()).toEqual([...PINNED].sort());
    for (const name of PINNED) {
      expect(tag(read('metadata', `${name}.xml`), 'artifactId')).toEqual([name]);
    }
  });

  it('pins every module to a version its maven-metadata.xml lists', () => {
    for (const name of PINNED) {
      expect(stableVersions(name)).toContain(ppsPinnedVersion(name));
    }
  });

  it('pins every module to its newest stable release', () => {
    for (const name of PINNED) {
      const newest = [...stableVersions(name)].sort(byVersion).pop();
      expect(`${name}:${ppsPinnedVersion(name)}`).toBe(`${name}:${newest}`);
    }
  });

  it('has a published POM for every pinned coordinate', () => {
    for (const name of PINNED) {
      const version = ppsPinnedVersion(name)!;
      const xml = pom(name, version);
      expect(tag(xml, 'groupId')[0]).toBe(PPS_GROUP);
      expect(tag(xml, 'artifactId')[0]).toBe(name);
      expect(tag(xml, 'version')[0]).toBe(version);
    }
  });

  it('pins pps_sdk_base to the newest base any pinned service POM asks for', () => {
    const asked = PPS_ALL_SERVICES.map((s) => {
      const name = `platform-service-${s}`;
      const base = baseInPom(pom(name, ppsPinnedVersion(name)!));
      expect(`${name}:${base}`).toMatch(/:\d+\.\d+\.\d+$/);
      return base!;
    });
    expect(asked.sort(byVersion).pop()).toBe(PPS_VERSION);
  });

  it('renders only coordinates with a published POM for the full-set fallback', () => {
    const block = renderPpsDependenciesBlock(
      resolvePpsServices(null, () => false),
      DEPS_MARKER
    );
    const coordinate = new RegExp(`${PPS_GROUP.replace(/\./g, '\\.')}:([a-z_-]+):([0-9.]+)"`, 'g');
    const rendered = [...block.matchAll(coordinate)];
    expect(rendered.length).toBeGreaterThan(PPS_ALL_SERVICES.length);
    for (const [, name, version] of rendered) {
      expect(() => pom(name, version)).not.toThrow();
    }
  });
});
