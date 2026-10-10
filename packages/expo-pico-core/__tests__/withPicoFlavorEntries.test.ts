import { AndroidConfig } from '@expo/config-plugins';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import withPico from '../plugin/src/withPico';
import { resolveOptions } from './support/picoOptions';
import { withPicoOpenXrLoader } from '../plugin/src/viro/withPicoOpenXrLoader';
import {
  withPicoAndroidManifest,
  withPicoPlatformServiceManifest,
} from '../plugin/src/withPicoAndroidManifest';
import {
  getPicoFlavorManifestState,
  markPicoFlavorPresent,
  withPicoFlavorFeature,
  withPicoFlavorPermission,
} from '../plugin/src/withPicoFlavorEntries';

type Manifest = AndroidConfig.Manifest.AndroidManifest;
type ModFn = (config: unknown) => Promise<{ modResults: Manifest }>;
type Config = {
  name: string;
  slug: string;
  plugins?: unknown[];
  mods?: { android?: Record<string, ModFn> };
};

const BILLING = 'com.picovr.payment.BILLING';
const SOCIAL = 'com.picovr.platform.permission.SOCIAL';
const ANCHOR = 'pico.software.spatialanchor';

function baseConfig(): Config {
  return { name: 'pico', slug: 'pico' };
}

function mainManifest(permissions: string[] = []): Manifest {
  return {
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      queries: [],
      'uses-permission': permissions.map((name) => ({ $: { 'android:name': name } })),
      application: [{ $: { 'android:name': '.MainApplication' } } as never],
    },
  } as Manifest;
}

const names = (list: unknown): string[] =>
  ((list ?? []) as { $: Record<string, string> }[]).map((e) => e.$['android:name']);

async function runMainManifest(config: Config, manifest: Manifest): Promise<Manifest> {
  const mod = config.mods?.android?.manifest;
  if (!mod) return manifest;
  const out = await mod({
    ...config,
    modResults: manifest,
    modRequest: { platform: 'android', projectRoot: '/tmp/unused' },
  });
  return out.modResults;
}

async function runDangerous(config: Config, projectRoot: string): Promise<void> {
  const mod = config.mods?.android?.dangerous;
  if (!mod) throw new Error('no dangerous mod registered');
  await mod({
    ...config,
    modResults: {},
    modRequest: { platform: 'android', projectRoot, platformProjectRoot: projectRoot },
  });
}

function readFlavor(projectRoot: string, flavor: string): string {
  return fs.readFileSync(
    path.join(projectRoot, 'android', 'app', 'src', flavor, 'AndroidManifest.xml'),
    'utf8'
  );
}

/** Core manifest writer plus the flavor marker, without the rest of withPico's mods. */
function withPicoFlavorManifest(config: Config, buildVariant: 'pico' | 'dual'): Config {
  markPicoFlavorPresent(config as never);
  return withPicoAndroidManifest(config as never, resolveOptions({ buildVariant })) as Config;
}

describe('withPicoFlavorPermission / withPicoFlavorFeature', () => {
  let projectRoot: string;
  let log: jest.SpyInstance;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pico-flavor-'));
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('withPico marks the pico flavor for pico and dual, not for mobile', () => {
    for (const [buildVariant, expected] of [
      ['pico', true],
      ['dual', true],
      ['mobile', false],
    ] as const) {
      const config = withPico(baseConfig() as never, { buildVariant, picoAppId: 'TEST' });
      expect(getPicoFlavorManifestState(config).hasPicoFlavor).toBe(expected);
    }
  });

  it('pico flavor: permissions land in the pico manifest, not in main (quest/mobile)', async () => {
    let config = withPicoFlavorManifest(baseConfig(), 'pico');
    config = withPicoFlavorPermission(config as never, BILLING) as Config;
    config = withPicoFlavorPermission(config as never, SOCIAL) as Config;

    const main = await runMainManifest(config, mainManifest(['android.permission.INTERNET']));
    expect(names(main.manifest['uses-permission'])).toEqual(['android.permission.INTERNET']);

    await runDangerous(config, projectRoot);
    const pico = readFlavor(projectRoot, 'pico');
    expect(pico).toContain(`<uses-permission android:name="${BILLING}"/>`);
    expect(pico).toContain(`<uses-permission android:name="${SOCIAL}"/>`);
  });

  it('pico flavor: strips copies a previous prebuild left in main', async () => {
    let config = withPicoFlavorManifest(baseConfig(), 'pico');
    config = withPicoFlavorPermission(config as never, BILLING) as Config;
    const main = await runMainManifest(
      config,
      mainManifest(['android.permission.INTERNET', BILLING])
    );
    expect(names(main.manifest['uses-permission'])).toEqual(['android.permission.INTERNET']);
  });

  it('does not depend on plugin order (feature plugin listed before core)', async () => {
    let config = withPicoFlavorPermission(baseConfig() as never, BILLING) as Config;
    config = withPicoFlavorManifest(config, 'pico');

    const main = await runMainManifest(config, mainManifest());
    expect(names(main.manifest['uses-permission'])).toEqual([]);
    await runDangerous(config, projectRoot);
    expect(readFlavor(projectRoot, 'pico')).toContain(BILLING);
  });

  it('dual: the dual source set gets the entries too', async () => {
    let config = withPicoFlavorManifest(baseConfig(), 'dual');
    config = withPicoFlavorPermission(config as never, BILLING) as Config;
    await runDangerous(config, projectRoot);
    expect(readFlavor(projectRoot, 'pico')).toContain(BILLING);
    expect(readFlavor(projectRoot, 'dual')).toContain(BILLING);
  });

  it('no pico flavor (buildVariant mobile or no core): permission goes to main', async () => {
    const config = withPicoFlavorPermission(baseConfig() as never, BILLING) as Config;
    const main = await runMainManifest(config, mainManifest());
    expect(names(main.manifest['uses-permission'])).toEqual([BILLING]);
  });

  it('is idempotent: repeated calls and re-runs keep one entry', async () => {
    let config = withPicoFlavorPermission(baseConfig() as never, BILLING) as Config;
    config = withPicoFlavorPermission(config as never, BILLING) as Config;
    const once = await runMainManifest(config, mainManifest());
    const twice = await runMainManifest(config, once);
    expect(names(twice.manifest['uses-permission'])).toEqual([BILLING]);
    expect(getPicoFlavorManifestState(config as never).permissions).toEqual([BILLING]);

    let flavored = withPicoFlavorManifest(baseConfig(), 'pico');
    flavored = withPicoFlavorPermission(flavored as never, BILLING) as Config;
    flavored = withPicoFlavorPermission(flavored as never, BILLING) as Config;
    await runDangerous(flavored, projectRoot);
    await runDangerous(flavored, projectRoot);
    expect(readFlavor(projectRoot, 'pico').split(BILLING)).toHaveLength(2);
  });

  it('routes uses-feature the same way', async () => {
    let config = withPicoFlavorManifest(baseConfig(), 'pico');
    config = withPicoFlavorFeature(config as never, { name: ANCHOR }) as Config;
    const stale = mainManifest();
    stale.manifest['uses-feature'] = [
      { $: { 'android:name': ANCHOR, 'android:required': 'false' } },
    ] as never;
    const main = await runMainManifest(config, stale);
    expect(names(main.manifest['uses-feature'])).toEqual([]);
    await runDangerous(config, projectRoot);
    expect(readFlavor(projectRoot, 'pico')).toContain(
      `<uses-feature android:name="${ANCHOR}" android:required="false"/>`
    );

    const mobile = withPicoFlavorFeature(baseConfig() as never, { name: ANCHOR }) as Config;
    const mobileMain = await runMainManifest(mobile, mainManifest());
    expect(mobileMain.manifest['uses-feature']).toEqual([
      { $: { 'android:name': ANCHOR, 'android:required': 'false' } },
    ]);
  });

  it('a feature is required if any caller asks, regardless of order', async () => {
    for (const order of [
      [false, true],
      [true, false],
    ]) {
      let config = baseConfig();
      for (const required of order) {
        config = withPicoFlavorFeature(config as never, { name: ANCHOR, required }) as Config;
      }
      expect(getPicoFlavorManifestState(config as never).features).toEqual([
        { name: ANCHOR, required: true },
      ]);
      const main = await runMainManifest(config, mainManifest());
      expect(main.manifest['uses-feature']).toEqual([
        { $: { 'android:name': ANCHOR, 'android:required': 'true' } },
      ]);
    }
  });

  it('does not add an empty uses-permission list to main when stripping', async () => {
    let config = withPicoFlavorManifest(baseConfig(), 'pico');
    config = withPicoFlavorPermission(config as never, BILLING) as Config;
    const bare = mainManifest();
    delete bare.manifest['uses-permission'];
    const main = await runMainManifest(config, bare);
    expect(main.manifest['uses-permission']).toBeUndefined();
  });
});

describe('PICO meta-data routing (pvr.app.id, pvr.app.type)', () => {
  let projectRoot: string;
  let log: jest.SpyInstance;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pico-meta-'));
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  const APP_ID = 'pvr.app.id';
  const APP_ID_LINE = `<meta-data android:name="${APP_ID}" android:value="@string/pico_app_id"/>`;

  function metaNames(m: Manifest): string[] {
    return names(m.manifest.application?.[0]?.['meta-data']);
  }

  function mainWithMeta(entries: [string, string][]): Manifest {
    const m = mainManifest();
    m.manifest.application![0]['meta-data'] = entries.map(([name, value]) => ({
      $: { 'android:name': name, 'android:value': value },
    }));
    return m;
  }

  /** Core with a pico (or dual) flavor plus the PPS meta-data plugin. */
  function corePico(buildVariant: 'pico' | 'dual', picoAppId = 'APP'): Config {
    const options = resolveOptions({ buildVariant, picoAppId });
    let config = baseConfig();
    markPicoFlavorPresent(config as never);
    config = withPicoAndroidManifest(config as never, options) as Config;
    return withPicoPlatformServiceManifest(config as never, options) as Config;
  }

  it('pico: pvr.app.id goes to the pico and mobile flavors, and is stripped from main', async () => {
    const config = corePico('pico');
    const main = await runMainManifest(config, mainWithMeta([[APP_ID, '@string/pico_app_id']]));
    expect(metaNames(main)).toEqual([]);

    await runDangerous(config, projectRoot);
    expect(readFlavor(projectRoot, 'pico')).toContain(APP_ID_LINE);
    expect(readFlavor(projectRoot, 'mobile')).toContain(APP_ID_LINE);
    expect(fs.existsSync(path.join(projectRoot, 'android/app/src/quest'))).toBe(false);
  });

  it('dual: the dual source set gets pvr.app.id too', async () => {
    await runDangerous(corePico('dual'), projectRoot);
    expect(readFlavor(projectRoot, 'dual')).toContain(APP_ID_LINE);
    expect(readFlavor(projectRoot, 'mobile')).toContain(APP_ID_LINE);
  });

  it('mobile flavor manifest: updated in place, keeps other content, no duplicates', async () => {
    const mobileDir = path.join(projectRoot, 'android/app/src/mobile');
    fs.mkdirSync(mobileDir, { recursive: true });
    fs.writeFileSync(
      path.join(mobileDir, 'AndroidManifest.xml'),
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android">' +
        '<uses-permission android:name="android.permission.CAMERA"/>' +
        '<application><meta-data android:name="pvr.app.id" android:value="old"/></application>' +
        '</manifest>'
    );
    const config = corePico('pico');
    await runDangerous(config, projectRoot);
    await runDangerous(config, projectRoot);
    const mobile = readFlavor(projectRoot, 'mobile');
    expect(mobile).toContain('android.permission.CAMERA');
    expect(mobile).toContain(APP_ID_LINE);
    expect(mobile).not.toContain('android:value="old"');
    expect(mobile.split(APP_ID)).toHaveLength(2);
  });

  it('buildVariant mobile (no flavors): pvr.app.id stays in main', async () => {
    const options = resolveOptions({ buildVariant: 'mobile', picoAppId: 'APP' });
    const config = withPicoPlatformServiceManifest(baseConfig() as never, options) as Config;
    const once = await runMainManifest(config, mainManifest());
    const twice = await runMainManifest(config, once);
    expect(twice.manifest.application?.[0]?.['meta-data']).toEqual([
      { $: { 'android:name': APP_ID, 'android:value': '@string/pico_app_id' } },
    ]);
  });

  it('no picoAppId with a pico flavor: a stale main copy is still stripped', async () => {
    const config = corePico('pico', '');
    const main = await runMainManifest(config, mainWithMeta([[APP_ID, '@string/pico_app_id']]));
    expect(metaNames(main)).toEqual([]);
    await runDangerous(config, projectRoot);
    expect(readFlavor(projectRoot, 'pico')).not.toContain(APP_ID);
    expect(fs.existsSync(path.join(projectRoot, 'android/app/src/mobile'))).toBe(false);
  });

  it('withPicoOpenXrLoader: pvr.app.type stays out of main with a pico flavor', async () => {
    let config = corePico('pico');
    config = withPicoOpenXrLoader(config as never) as Config;
    const main = await runMainManifest(config, mainWithMeta([['pvr.app.type', 'vr']]));
    expect(metaNames(main)).toEqual([]);
    // The Khronos loader entries are vendor-neutral and stay in main.
    expect(names(main.manifest['uses-permission'])).toContain(
      'org.khronos.openxr.permission.OPENXR'
    );
    await runDangerous(config, projectRoot);
    // Core's launcher contract writes pvr.app.type from appType; that value wins
    // and the <application> keeps a single entry. (.VRActivity carries its own.)
    const pico = await AndroidConfig.Manifest.readAndroidManifestAsync(
      path.join(projectRoot, 'android/app/src/pico/AndroidManifest.xml')
    );
    const appTypes = (pico.manifest.application?.[0]?.['meta-data'] ?? []).filter(
      (m) => m.$['android:name'] === 'pvr.app.type'
    );
    expect(appTypes).toHaveLength(1);
    expect(readFlavor(projectRoot, 'mobile')).not.toContain('pvr.app.type');
  });

  it('withPicoOpenXrLoader without core flavors: pvr.app.type goes to main', async () => {
    const config = withPicoOpenXrLoader(baseConfig() as never) as Config;
    const main = await runMainManifest(config, mainManifest());
    expect(metaNames(main)).toEqual(['pvr.app.type']);
  });

  it('buildVariant mobile + expo-horizon-core (quest flavor): PICO entries go to mobile, not main', async () => {
    const options = resolveOptions({ buildVariant: 'mobile', picoAppId: 'APP' });
    let config: Config = { ...baseConfig(), plugins: ['expo-horizon-core'] } as Config;
    config = withPico(config as never, { buildVariant: 'mobile', picoAppId: 'APP' }) as Config;
    config = withPicoFlavorPermission(config as never, BILLING) as Config;
    config = withPicoOpenXrLoader(config as never) as Config;
    expect(options.buildVariant).toBe('mobile');

    const stale = mainWithMeta([
      [APP_ID, '@string/pico_app_id'],
      ['pvr.app.type', 'vr'],
    ]);
    stale.manifest['uses-permission'] = [{ $: { 'android:name': BILLING } }] as never;
    const main = await runMainManifest(config, stale);
    expect(metaNames(main)).toEqual([]);
    expect(names(main.manifest['uses-permission'])).not.toContain(BILLING);

    // The full withPico chain also writes android/local.properties.
    fs.mkdirSync(path.join(projectRoot, 'android'), { recursive: true });
    await runDangerous(config, projectRoot);
    const mobile = readFlavor(projectRoot, 'mobile');
    expect(mobile).toContain(APP_ID_LINE);
    expect(mobile).toContain('<meta-data android:name="pvr.app.type" android:value="vr"/>');
    expect(mobile).toContain(`<uses-permission android:name="${BILLING}"/>`);
    expect(fs.existsSync(path.join(projectRoot, 'android/app/src/pico'))).toBe(false);
  });

  it('mobile flavor manifest: stale PICO entries are removed when they no longer belong', async () => {
    const mobileDir = path.join(projectRoot, 'android/app/src/mobile');
    fs.mkdirSync(mobileDir, { recursive: true });
    fs.writeFileSync(
      path.join(mobileDir, 'AndroidManifest.xml'),
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android">' +
        '<uses-permission android:name="android.permission.CAMERA"/>' +
        `<uses-permission android:name="${BILLING}"/>` +
        '<application>' +
        '<meta-data android:name="pvr.app.id" android:value="@string/pico_app_id"/>' +
        '<meta-data android:name="pvr.app.type" android:value="vr"/>' +
        '<meta-data android:name="keep.me" android:value="1"/>' +
        '</application></manifest>'
    );
    // Pico flavor, no app ID: nothing PICO belongs in the mobile flavor.
    await runDangerous(corePico('pico', ''), projectRoot);
    const mobile = readFlavor(projectRoot, 'mobile');
    expect(mobile).not.toMatch(/pvr\.|picovr/);
    expect(mobile).toContain('android.permission.CAMERA');
    expect(mobile).toContain('keep.me');
  });

  it('single-variant app: no mobile flavor manifest is created', async () => {
    const options = resolveOptions({ buildVariant: 'mobile', picoAppId: 'APP' });
    const config = withPicoPlatformServiceManifest(baseConfig() as never, options) as Config;
    await runDangerous(config, projectRoot);
    expect(fs.existsSync(path.join(projectRoot, 'android/app/src/mobile'))).toBe(false);
  });

  it('platformService.picoAppId alone is enough (same ID withPicoStrings writes)', async () => {
    const options = resolveOptions({
      buildVariant: 'mobile',
      platformService: { picoAppId: 'PS_APP', picoAppKey: 'KEY' },
    });
    const config = withPicoPlatformServiceManifest(baseConfig() as never, options) as Config;
    const main = await runMainManifest(config, mainManifest());
    expect(metaNames(main)).toEqual([APP_ID]);
  });
});
