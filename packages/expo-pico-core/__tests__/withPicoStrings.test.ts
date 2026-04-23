import type { ResourceXML } from '@expo/config-plugins/build/android/Resources';

import { resolveOptions } from '../plugin/src/types';
import { withPicoStrings } from '../plugin/src/withPicoStrings';

type FakeConfig = {
  modResults?: ResourceXML;
  mods?: Record<string, Record<string, (...args: any[]) => any>>;
};

function run(
  config: FakeConfig,
  options: ReturnType<typeof resolveOptions>
): FakeConfig {
  const result: any = withPicoStrings(config as any, options);
  const modFn = result.mods?.android?.strings as ((c: any) => any) | undefined;
  if (!modFn || !config.modResults) return result;
  return modFn({
    ...result,
    modResults: config.modResults,
    modRequest: { platform: 'android', projectRoot: '/tmp/project' },
  });
}

function seedEmpty(): FakeConfig {
  return { modResults: { resources: {} } as any };
}

function getStringResource(config: FakeConfig, name: string): any {
  const res = (config.modResults as any).resources as { string?: any[] };
  return (res.string ?? []).find((s: any) => s.$?.name === name);
}

function getAllStringResources(config: FakeConfig): string[] {
  const res = (config.modResults as any).resources as { string?: any[] };
  return (res.string ?? []).map((s: any) => s.$?.name);
}

describe('withPicoStrings — core resources', () => {
  it('always emits pico_app_id and pico_spatial_mode', () => {
    const options = resolveOptions({ spatialMode: 'shared-space' });
    const config = seedEmpty();
    run(config, options);

    const appId = getStringResource(config, 'pico_app_id');
    const spatial = getStringResource(config, 'pico_spatial_mode');
    expect(appId).toBeDefined();
    expect(appId.$.translatable).toBe('false');
    expect(spatial._).toBe('shared-space');
  });

  it('uses platformService.picoAppId when provided (preferred over legacy field)', () => {
    const config = seedEmpty();
    run(
      config,
      resolveOptions({
        picoAppId: 'LEGACY',
        platformService: { picoAppId: 'MODERN' },
      })
    );
    expect(getStringResource(config, 'pico_app_id')._).toBe('MODERN');
  });

  it('falls back to legacy picoAppId when platformService.picoAppId is absent', () => {
    const config = seedEmpty();
    run(config, resolveOptions({ picoAppId: 'LEGACY_ONLY' }));
    expect(getStringResource(config, 'pico_app_id')._).toBe('LEGACY_ONLY');
  });
});

describe('withPicoStrings — Platform SDK identity', () => {
  it('emits pico_app_key when platformService.picoAppKey is set', () => {
    const config = seedEmpty();
    run(
      config,
      resolveOptions({
        platformService: { picoAppId: 'APP', picoAppKey: 'KEY' },
      })
    );
    expect(getStringResource(config, 'pico_app_key')._).toBe('KEY');
  });

  it('does not emit pico_app_key when unset', () => {
    const config = seedEmpty();
    run(config, resolveOptions({}));
    expect(getStringResource(config, 'pico_app_key')).toBeUndefined();
  });

  it('emits _foreign variants for dual-region apps', () => {
    const config = seedEmpty();
    run(
      config,
      resolveOptions({
        platformService: {
          picoAppId: 'CN_APP',
          picoAppKey: 'CN_KEY',
          foreign: { picoAppId: 'GLOBAL_APP', picoAppKey: 'GLOBAL_KEY' },
        },
      })
    );
    expect(getStringResource(config, 'pico_app_id')._).toBe('CN_APP');
    expect(getStringResource(config, 'pico_app_id_foreign')._).toBe('GLOBAL_APP');
    expect(getStringResource(config, 'pico_app_key')._).toBe('CN_KEY');
    expect(getStringResource(config, 'pico_app_key_foreign')._).toBe('GLOBAL_KEY');
  });

  it('emits IAP identity (merchant + pay) when set', () => {
    const config = seedEmpty();
    run(
      config,
      resolveOptions({
        platformService: {
          picoAppId: 'APP',
          picoAppKey: 'KEY',
          picoMerchantId: 'MERCHANT',
          picoPayKey: 'PAY',
        },
      })
    );
    expect(getStringResource(config, 'pico_merchant_id')._).toBe('MERCHANT');
    expect(getStringResource(config, 'pico_pay_key')._).toBe('PAY');
  });
});

describe('withPicoStrings — idempotency and cleanup', () => {
  it('updates existing values in place on repeat apply', () => {
    const config = seedEmpty();
    run(config, resolveOptions({ platformService: { picoAppKey: 'OLD' } }));
    run(config, resolveOptions({ platformService: { picoAppKey: 'NEW' } }));

    const res = (config.modResults as any).resources as { string: any[] };
    const matches = res.string.filter((s: any) => s.$?.name === 'pico_app_key');
    expect(matches).toHaveLength(1);
    expect(matches[0]._).toBe('NEW');
  });

  it('removes pico_app_key when identity is cleared between prebuilds', () => {
    const config = seedEmpty();
    run(
      config,
      resolveOptions({ platformService: { picoAppId: 'APP', picoAppKey: 'KEY' } })
    );
    expect(getStringResource(config, 'pico_app_key')).toBeDefined();

    run(config, resolveOptions({}));
    expect(getStringResource(config, 'pico_app_key')).toBeUndefined();
  });

  it('removes _foreign pair independently of the CN pair', () => {
    const config = seedEmpty();
    run(
      config,
      resolveOptions({
        platformService: {
          picoAppId: 'CN',
          picoAppKey: 'CNK',
          foreign: { picoAppId: 'GL', picoAppKey: 'GLK' },
        },
      })
    );
    run(
      config,
      resolveOptions({
        platformService: { picoAppId: 'CN', picoAppKey: 'CNK' },
      })
    );
    expect(getStringResource(config, 'pico_app_id')._).toBe('CN');
    expect(getStringResource(config, 'pico_app_id_foreign')).toBeUndefined();
    expect(getStringResource(config, 'pico_app_key_foreign')).toBeUndefined();
  });

  it('preserves unrelated string resources', () => {
    const config = seedEmpty();
    (config.modResults as any).resources.string = [
      { $: { name: 'app_name', translatable: 'false' }, _: 'MyApp' },
    ];
    run(
      config,
      resolveOptions({ platformService: { picoAppId: 'APP', picoAppKey: 'KEY' } })
    );
    const names = getAllStringResources(config);
    expect(names).toContain('app_name');
    expect(names).toContain('pico_app_id');
    expect(names).toContain('pico_app_key');
  });
});
