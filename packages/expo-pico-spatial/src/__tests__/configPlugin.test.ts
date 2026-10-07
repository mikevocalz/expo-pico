import withPico, { getPicoFlavorManifestState } from '@expo-pico/core/plugin';

import plugin from '../../plugin/src/withPicoSpatial';

type Entry = { $: Record<string, string> };
type Manifest = { manifest: Record<string, unknown> };
type ModFn = (config: unknown) => Promise<{ modResults: Manifest }>;
type Config = { name: string; slug: string; mods?: { android?: Record<string, ModFn> } };

const NAME = 'pico.software.spatialanchor';
const LIST = 'uses-feature';

async function runMainManifest(config: Config, entries: string[]): Promise<string[]> {
  const mod = config.mods?.android?.manifest;
  if (!mod) throw new Error('no manifest mod registered');
  const out = await mod({
    ...config,
    modResults: {
      manifest: {
        $: {},
        [LIST]: entries.map((name) => ({ $: { 'android:name': name } })),
        application: [{ $: { 'android:name': '.MainApplication' } }],
      },
    },
    modRequest: { platform: 'android', projectRoot: '/tmp/unused' },
  });
  return ((out.modResults.manifest[LIST] ?? []) as Entry[]).map((e) => e.$['android:name']);
}

describe('config plugin manifest routing', () => {
  it('keeps ' + NAME + ' out of the main manifest when core has a pico flavor', async () => {
    let config = withPico({ name: 'x', slug: 'x' } as never, {
      buildVariant: 'pico',
      picoAppId: 'TEST',
    }) as Config;
    config = plugin(config as never, { anchorPersistence: true }) as Config;
    expect(await runMainManifest(config, [NAME])).toEqual([]);
    expect(getPicoFlavorManifestState(config as never).features).toEqual([
      { name: NAME, required: false },
    ]);
  });

  it('gives the same result when the plugin is listed before core', async () => {
    let config = plugin({ name: 'x', slug: 'x' } as never, { anchorPersistence: true }) as Config;
    config = withPico(config as never, { buildVariant: 'pico', picoAppId: 'TEST' }) as Config;
    expect(await runMainManifest(config, [NAME])).toEqual([]);
  });

  it('writes ' + NAME + ' to the main manifest once when there is no pico flavor', async () => {
    let config = withPico({ name: 'x', slug: 'x' } as never, { buildVariant: 'mobile' }) as Config;
    config = plugin(config as never, { anchorPersistence: true }) as Config;
    const first = await runMainManifest(config, []);
    expect(first).toEqual([NAME]);
    expect(await runMainManifest(config, first)).toEqual([NAME]);
  });
});
