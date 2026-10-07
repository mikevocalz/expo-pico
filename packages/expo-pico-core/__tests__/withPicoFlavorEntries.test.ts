import type { AndroidConfig } from '@expo/config-plugins';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import withPico from '../plugin/src/withPico';
import { resolveOptions } from '../plugin/src/types';
import { withPicoAndroidManifest } from '../plugin/src/withPicoAndroidManifest';
import {
  getPicoFlavorManifestState,
  markPicoFlavorPresent,
  withPicoFlavorFeature,
  withPicoFlavorPermission,
} from '../plugin/src/withPicoFlavorEntries';

type Manifest = AndroidConfig.Manifest.AndroidManifest;
type ModFn = (config: unknown) => Promise<{ modResults: Manifest }>;
type Config = { name: string; slug: string; mods?: { android?: Record<string, ModFn> } };

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
      const config = withPico(baseConfig() as never, { buildVariant });
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
