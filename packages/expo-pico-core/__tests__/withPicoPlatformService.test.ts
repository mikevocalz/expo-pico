import type { AndroidConfig } from '@expo/config-plugins';

import { resolveOptions } from '../plugin/src/types';
import {
  applyPlatformServiceContract,
  PLATFORM_SERVICE_ACTIVITIES,
} from '../plugin/src/withPicoPlatformService';

type Manifest = AndroidConfig.Manifest.AndroidManifest;

function emptyManifest(): Manifest {
  return {
    manifest: {
      $: {
        'xmlns:android': 'http://schemas.android.com/apk/res/android',
        'xmlns:tools': 'http://schemas.android.com/tools',
      },
      application: [{ $: {}, activity: [] } as any],
    },
  } as Manifest;
}

function activityNames(m: Manifest): string[] {
  return ((m.manifest.application![0] as any).activity ?? []).map(
    (a: any) => a.$?.['android:name']
  );
}

describe('applyPlatformServiceContract — gating', () => {
  it('is a no-op when no platformService identity is provided', () => {
    const options = resolveOptions({});
    const m = emptyManifest();
    applyPlatformServiceContract(m, options);
    expect(activityNames(m)).toHaveLength(0);
  });

  it('is a no-op when declareActivities is explicitly false', () => {
    const options = resolveOptions({
      platformService: {
        picoAppId: 'APP123',
        picoAppKey: 'KEY456',
        declareActivities: false,
      },
    });
    const m = emptyManifest();
    applyPlatformServiceContract(m, options);
    expect(activityNames(m)).toHaveLength(0);
  });

  it('emits both activities when identity is provided', () => {
    const options = resolveOptions({
      platformService: { picoAppId: 'APP123', picoAppKey: 'KEY456' },
    });
    const m = emptyManifest();
    applyPlatformServiceContract(m, options);

    const names = activityNames(m);
    expect(names).toContain(PLATFORM_SERVICE_ACTIVITIES.AUTH);
    expect(names).toContain(PLATFORM_SERVICE_ACTIVITIES.BROWSER);
  });

  it('emits activities when only legacy top-level picoAppId is used', () => {
    const options = resolveOptions({ picoAppId: 'LEGACY_APP' });
    const m = emptyManifest();
    applyPlatformServiceContract(m, options);
    expect(activityNames(m)).toEqual([
      PLATFORM_SERVICE_ACTIVITIES.AUTH,
      PLATFORM_SERVICE_ACTIVITIES.BROWSER,
    ]);
  });

  it('emits activities when only foreign identity is set', () => {
    const options = resolveOptions({
      platformService: { foreign: { picoAppId: 'FOREIGN_APP' } },
    });
    const m = emptyManifest();
    applyPlatformServiceContract(m, options);
    expect(activityNames(m)).toEqual([
      PLATFORM_SERVICE_ACTIVITIES.AUTH,
      PLATFORM_SERVICE_ACTIVITIES.BROWSER,
    ]);
  });
});

describe('applyPlatformServiceContract — activity attributes', () => {
  it('marks both activities exported=false with tools:node=merge', () => {
    const options = resolveOptions({
      platformService: { picoAppId: 'APP123', picoAppKey: 'KEY456' },
    });
    const m = emptyManifest();
    applyPlatformServiceContract(m, options);

    const app = m.manifest.application![0] as any;
    for (const name of [
      PLATFORM_SERVICE_ACTIVITIES.AUTH,
      PLATFORM_SERVICE_ACTIVITIES.BROWSER,
    ]) {
      const activity = app.activity.find((a: any) => a.$['android:name'] === name);
      expect(activity.$['android:exported']).toBe('false');
      expect(activity.$['tools:node']).toBe('merge');
    }
  });
});

describe('applyPlatformServiceContract — idempotency', () => {
  it('does not duplicate activities on repeat application', () => {
    const options = resolveOptions({
      platformService: { picoAppId: 'APP123', picoAppKey: 'KEY456' },
    });
    const m = emptyManifest();
    applyPlatformServiceContract(m, options);
    applyPlatformServiceContract(m, options);
    applyPlatformServiceContract(m, options);

    const names = activityNames(m);
    expect(names.filter((n) => n === PLATFORM_SERVICE_ACTIVITIES.AUTH)).toHaveLength(1);
    expect(names.filter((n) => n === PLATFORM_SERVICE_ACTIVITIES.BROWSER)).toHaveLength(1);
  });

  it('removes activities when identity is cleared between applies', () => {
    const m = emptyManifest();
    applyPlatformServiceContract(
      m,
      resolveOptions({ platformService: { picoAppId: 'APP123', picoAppKey: 'KEY456' } })
    );
    expect(activityNames(m)).toContain(PLATFORM_SERVICE_ACTIVITIES.AUTH);

    applyPlatformServiceContract(m, resolveOptions({}));
    expect(activityNames(m)).not.toContain(PLATFORM_SERVICE_ACTIVITIES.AUTH);
    expect(activityNames(m)).not.toContain(PLATFORM_SERVICE_ACTIVITIES.BROWSER);
  });

  it('preserves unrelated activities (e.g. a user-declared .MainActivity)', () => {
    const m = emptyManifest();
    (m.manifest.application![0] as any).activity.push({
      $: { 'android:name': '.MainActivity' },
    });

    applyPlatformServiceContract(
      m,
      resolveOptions({ platformService: { picoAppId: 'APP123', picoAppKey: 'KEY456' } })
    );
    expect(activityNames(m)).toContain('.MainActivity');

    applyPlatformServiceContract(m, resolveOptions({}));
    expect(activityNames(m)).toEqual(['.MainActivity']);
  });
});

describe('resolveOptions — platformService surface', () => {
  it('hasIdentity is false for empty options', () => {
    expect(resolveOptions({}).platformService.hasIdentity).toBe(false);
  });

  it('hasIdentity is true when only top-level picoAppId is set', () => {
    expect(resolveOptions({ picoAppId: 'LEGACY' }).platformService.hasIdentity).toBe(true);
  });

  it('hasIdentity is true when only platformService.picoAppKey is set', () => {
    expect(
      resolveOptions({ platformService: { picoAppKey: 'KEY' } }).platformService
        .hasIdentity
    ).toBe(true);
  });

  it('hasIapIdentity requires both picoMerchantId and picoPayKey', () => {
    expect(
      resolveOptions({ platformService: { picoMerchantId: 'M' } }).platformService
        .hasIapIdentity
    ).toBe(false);
    expect(
      resolveOptions({ platformService: { picoMerchantId: 'M', picoPayKey: 'P' } })
        .platformService.hasIapIdentity
    ).toBe(true);
  });

  it('hasIapIdentity can be satisfied by foreign region alone', () => {
    expect(
      resolveOptions({
        platformService: {
          foreign: { picoMerchantId: 'FM', picoPayKey: 'FP' },
        },
      }).platformService.hasIapIdentity
    ).toBe(true);
  });

  it('trims and normalizes whitespace-only identity values to null', () => {
    const resolved = resolveOptions({
      platformService: { picoAppId: '   ', picoAppKey: '' },
    });
    expect(resolved.platformService.picoAppId).toBeNull();
    expect(resolved.platformService.picoAppKey).toBeNull();
    expect(resolved.platformService.hasIdentity).toBe(false);
  });

  it('platformService.picoAppId takes precedence over legacy top-level picoAppId', () => {
    const resolved = resolveOptions({
      picoAppId: 'LEGACY',
      platformService: { picoAppId: 'MODERN' },
    });
    expect(resolved.platformService.picoAppId).toBe('MODERN');
  });

  it('declareActivities defaults to true when identity present, false when absent', () => {
    expect(resolveOptions({}).platformService.declareActivities).toBe(false);
    expect(
      resolveOptions({ platformService: { picoAppId: 'APP' } }).platformService
        .declareActivities
    ).toBe(true);
  });
});
