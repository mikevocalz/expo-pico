import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Spawns the built `cli/build/doctor.js` against a temporary project
 * directory containing an app.config.json, and asserts on stdout + exit
 * code. If the CLI hasn't been built yet, every test is skipped with a
 * clear message rather than silently passing.
 *
 * These tests exercise the full CLI surface that consumers see — arg
 * parsing, config loading, pretty-printed and JSON output, exit codes.
 */

const DOCTOR_BIN = path.resolve(__dirname, '..', 'cli', 'build', 'doctor.js');
const BIN_EXISTS = fs.existsSync(DOCTOR_BIN);

function writeFixture(config: unknown): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-pico-doctor-'));
  fs.writeFileSync(path.join(dir, 'app.config.json'), JSON.stringify(config, null, 2));
  return dir;
}

function runDoctor(
  projectRoot: string,
  extraArgs: string[] = []
): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync(process.execPath, [DOCTOR_BIN, '--project', projectRoot, ...extraArgs], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

const describeWhenBuilt = BIN_EXISTS ? describe : describe.skip;

describeWhenBuilt('expo-pico-doctor CLI', () => {
  it('exits 0 and prints "No issues" for a clean config', () => {
    const dir = writeFixture({
      expo: {
        name: 't',
        slug: 't',
        plugins: [
          [
            '@expo-pico/core',
            {
              xrMode: 'pico-os5',
              appType: 'vr',
              platformService: { picoAppId: 'APP', picoAppKey: 'KEY' },
            },
          ],
        ],
      },
    });
    const out = runDoctor(dir);
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('No issues');
  });

  it('reports missing platform credentials as INFO but keeps XR enabled', () => {
    const dir = writeFixture({
      expo: {
        name: 't',
        slug: 't',
        plugins: [['@expo-pico/core', { xrMode: 'pico-swan', appType: 'vr' }]],
      },
    });
    const out = runDoctor(dir);
    expect(out.stdout).toContain('identity.missing');
    expect(out.stdout).not.toContain('ERROR');
    expect(out.status).toBe(0);
  });

  it('--fail-on-warning flips warning into exit code 1', () => {
    const dir = writeFixture({
      expo: {
        name: 't',
        slug: 't',
        plugins: [['@expo-pico/core', { picoAppId: 'APP', buildVariant: 'mobile', appType: 'vr' }]],
      },
    });
    const out = runDoctor(dir, ['--fail-on-warning']);
    expect(out.status).toBe(1);
  });

  it('--json emits machine-readable output with the same findings', () => {
    const dir = writeFixture({
      expo: {
        name: 't',
        slug: 't',
        plugins: [['@expo-pico/core', { xrMode: 'pico-swan', appType: 'vr' }]],
      },
    });
    const out = runDoctor(dir, ['--json']);
    const parsed = JSON.parse(out.stdout);
    expect(parsed.findings.some((f: any) => f.id === 'identity.missing')).toBe(true);
    expect(parsed.summary.errorCount).toBe(0);
    expect(parsed.resolvedOptions.isPicoEnabled).toBe(true);
    expect(parsed.resolvedOptions.xrMode).toBe('pico-swan');
  });

  it('exits 2 when expo-pico-core plugin is missing from app.config', () => {
    const dir = writeFixture({ expo: { name: 't', slug: 't', plugins: [] } });
    const out = runDoctor(dir);
    expect(out.status).toBe(2);
    expect(out.stderr).toContain('expo-pico-core plugin not found');
  });

  it('exits 2 when no app.config can be located', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-pico-doctor-empty-'));
    const out = runDoctor(dir);
    expect(out.status).toBe(2);
  });

  it('accepts a plain "@expo-pico/core" string entry (no options)', () => {
    const dir = writeFixture({
      expo: { name: 't', slug: 't', plugins: ['@expo-pico/core'] },
    });
    const out = runDoctor(dir);
    // PICO XR is enabled; Platform Services credentials remain optional.
    expect(out.stdout).toContain('identity.missing');
    expect(out.status).toBe(0);
  });

  it('reports multiple findings with stable order', () => {
    // Intentionally bad config: triggers build-variant.ignored-apptype
    // (mobile + vr), capabilities.ignored-under-mobile (handTracking +
    // eyeTracking under mobile xrMode), refresh-rates.ignored-under-mobile,
    // and iap.partial-identity (merchant without pay key).
    const dir = writeFixture({
      expo: {
        name: 't',
        slug: 't',
        plugins: [
          [
            '@expo-pico/core',
            {
              xrMode: 'mobile',
              buildVariant: 'mobile',
              appType: 'vr',
              handTracking: true,
              eyeTracking: true,
              refreshRates: [72, 90],
              platformService: { picoAppId: 'APP', picoMerchantId: 'M' },
            },
          ],
        ],
      },
    });
    const out1 = runDoctor(dir, ['--json']);
    const out2 = runDoctor(dir, ['--json']);
    const ids1 = JSON.parse(out1.stdout).findings.map((f: any) => f.id);
    const ids2 = JSON.parse(out2.stdout).findings.map((f: any) => f.id);
    expect(ids1).toEqual(ids2);
    expect(ids1.length).toBeGreaterThanOrEqual(3);
    expect(ids1).toContain('build-variant.ignored-apptype');
    expect(ids1).toContain('capabilities.ignored-under-mobile');
    expect(ids1).toContain('refresh-rates.ignored-under-mobile');
  });

  it('flags PPS coordinates against the version each module is pinned to', () => {
    const dir = writeFixture({
      expo: {
        name: 't',
        slug: 't',
        plugins: [
          [
            '@expo-pico/core',
            {
              xrMode: 'pico-os5',
              appType: 'vr',
              platformService: { picoAppId: 'APP', picoAppKey: 'KEY' },
            },
          ],
        ],
      },
    });
    fs.mkdirSync(path.join(dir, 'android', 'app'), { recursive: true });
    // compliance never published 1.1.2, so 1.0.0 is its pin. auth at 1.0.0
    // here is hand-written: it sits outside the plugin's PPS block.
    fs.writeFileSync(
      path.join(dir, 'android', 'app', 'build.gradle'),
      [
        'dependencies {',
        '    picoImplementation "com.pico.pps:platform-service-compliance:1.0.0"',
        '    picoImplementation "com.pico.pps:platform-service-auth:1.0.0"',
        '    picoImplementation "com.pico.pps:platform-service-iap:1.1.2"',
        '}',
      ].join('\n')
    );
    const parsed = JSON.parse(runDoctor(dir, ['--json']).stdout);
    const skew = parsed.findings.find((f: any) => f.id === 'pps-coordinate-version-skew');
    expect(skew).toBeDefined();
    expect(skew.message).toContain('com.pico.pps:platform-service-auth:1.0.0');
    expect(skew.message).not.toContain('platform-service-compliance');
    expect(skew.message).not.toContain('platform-service-iap');
    expect(skew.message).toContain('Remove it.');
    expect(skew.message).not.toContain('prebuild');
  });

  it('tells a project with an older generated PPS block to prebuild again', () => {
    const dir = writeFixture({
      expo: {
        name: 't',
        slug: 't',
        plugins: [
          [
            '@expo-pico/core',
            {
              xrMode: 'pico-os5',
              appType: 'vr',
              platformService: { picoAppId: 'APP', picoAppKey: 'KEY' },
            },
          ],
        ],
      },
    });
    fs.mkdirSync(path.join(dir, 'android', 'app'), { recursive: true });
    fs.copyFileSync(
      path.join(__dirname, 'fixtures/pps/legacy-1.0.0/app-build.gradle'),
      path.join(dir, 'android', 'app', 'build.gradle')
    );
    const parsed = JSON.parse(runDoctor(dir, ['--json']).stdout);
    const skew = parsed.findings.find((f: any) => f.id === 'pps-coordinate-version-skew');
    expect(skew).toBeDefined();
    expect(skew.message).toContain('com.pico.pps:platform-service-auth:1.0.0');
    expect(skew.message).toContain('older plugin version');
    expect(skew.message).toContain('`npx expo prebuild`');
    expect(skew.message).not.toContain('--clean');
    expect(skew.message).not.toContain('Remove it.');
  });
});

if (!BIN_EXISTS) {
  describe('expo-pico-doctor CLI', () => {
    it.skip('CLI binary not built; run `yarn build:cli` to enable these tests', () => {
      /* skipped — cli/build/doctor.js not present */
    });
  });
}
