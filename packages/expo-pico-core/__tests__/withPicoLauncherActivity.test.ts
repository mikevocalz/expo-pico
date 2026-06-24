import type { AndroidConfig } from '@expo/config-plugins';

import {
  APP_TYPE_MANIFEST_VALUE,
  LAUNCHER_CATEGORIES,
  MANIFEST_META,
  PICO_QUERY_PACKAGES,
} from '../plugin/src/constants';
import { resolveOptions } from '../plugin/src/types';
import { applyLauncherContract } from '../plugin/src/withPicoLauncherActivity';

type Manifest = AndroidConfig.Manifest.AndroidManifest;

function emptyManifest(): Manifest {
  return {
    manifest: {
      $: {
        'xmlns:android': 'http://schemas.android.com/apk/res/android',
        'xmlns:tools': 'http://schemas.android.com/tools',
      },
      queries: [],
      'uses-permission': [],
      'uses-feature': [],
      application: [{ $: {}, 'meta-data': [], activity: [] } as any],
    },
  } as Manifest;
}

function getApplication(m: Manifest): any {
  return m.manifest.application![0];
}

function getAppMeta(m: Manifest, name: string): any {
  return (getApplication(m)['meta-data'] ?? []).find(
    (md: any) => md.$?.['android:name'] === name
  );
}

function getImmersiveIntentFilters(m: Manifest): any[] {
  const activity = getApplication(m).activity?.find(
    (a: any) => a.$?.['android:name'] === '.MainActivity'
  );
  if (!activity) return [];
  return (activity['intent-filter'] ?? []).filter(
    (f: any) =>
      Array.isArray(f.category) &&
      f.category.some(
        (c: any) =>
          c.$?.['android:name'] === LAUNCHER_CATEGORIES.OPENXR_IMMERSIVE_HMD
      )
  );
}

function getQueriesPackages(m: Manifest): string[] {
  const queries = (m.manifest as any).queries as any[] | undefined;
  if (!queries || queries.length === 0) return [];
  return (queries[0].package ?? []).map((p: any) => p.$?.['android:name']);
}

describe('applyLauncherContract — appType gating', () => {
  it('is a no-op when appType resolves to 2d (xrMode=mobile default)', () => {
    const options = resolveOptions({ buildVariant: 'mobile' });
    expect(options.appType).toBe('2d');

    const m = emptyManifest();
    applyLauncherContract(m, options);

    expect(getAppMeta(m, MANIFEST_META.PVR_APP_TYPE)).toBeUndefined();
    expect(getImmersiveIntentFilters(m)).toHaveLength(0);
    expect(getQueriesPackages(m)).toHaveLength(0);
  });

  it('is a no-op when appType explicitly set to 2d', () => {
    const options = resolveOptions({ xrMode: 'pico-os5', appType: '2d' });
    const m = emptyManifest();
    applyLauncherContract(m, options);

    expect(getAppMeta(m, MANIFEST_META.PVR_APP_TYPE)).toBeUndefined();
    expect(getImmersiveIntentFilters(m)).toHaveLength(0);
    expect(getQueriesPackages(m)).toHaveLength(0);
  });
});

describe('applyLauncherContract — pvr.app.type meta-data', () => {
  it('emits pvr.app.type=vr for default xrMode=pico-os5', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const m = emptyManifest();
    applyLauncherContract(m, options);

    const meta = getAppMeta(m, MANIFEST_META.PVR_APP_TYPE);
    expect(meta).toBeDefined();
    expect(meta.$['android:value']).toBe('vr');
  });

  it('emits pvr.app.type=mr when explicitly requested', () => {
    const options = resolveOptions({ xrMode: 'pico-swan', appType: 'mr' });
    const m = emptyManifest();
    applyLauncherContract(m, options);

    const meta = getAppMeta(m, MANIFEST_META.PVR_APP_TYPE);
    expect(meta.$['android:value']).toBe('mr');
  });

  it('updates existing pvr.app.type in place rather than duplicating', () => {
    const options = resolveOptions({ xrMode: 'pico-os5', appType: 'vr' });
    const m = emptyManifest();
    // Pre-seed with an older value.
    getApplication(m)['meta-data'].push({
      $: { 'android:name': MANIFEST_META.PVR_APP_TYPE, 'android:value': '2d' },
    });

    applyLauncherContract(m, options);

    const allAppTypeMeta = getApplication(m)['meta-data'].filter(
      (md: any) => md.$?.['android:name'] === MANIFEST_META.PVR_APP_TYPE
    );
    expect(allAppTypeMeta).toHaveLength(1);
    expect(allAppTypeMeta[0].$['android:value']).toBe('vr');
  });
});

describe('applyLauncherContract — launcher activity intent-filter', () => {
  it('adds an .MainActivity with MAIN+LAUNCHER + immersive categories', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const m = emptyManifest();
    applyLauncherContract(m, options);

    const filters = getImmersiveIntentFilters(m);
    expect(filters).toHaveLength(1);

    const filter = filters[0];
    const actions = filter.action.map((a: any) => a.$?.['android:name']);
    const categories = filter.category.map((c: any) => c.$?.['android:name']);

    expect(actions).toContain('android.intent.action.MAIN');
    expect(categories).toContain('android.intent.category.LAUNCHER');
    expect(categories).toContain(LAUNCHER_CATEGORIES.OPENXR_IMMERSIVE_HMD);
    expect(categories).toContain(LAUNCHER_CATEGORIES.PICO_VR);
    expect(categories).toContain(LAUNCHER_CATEGORIES.PICOVR_VR_LEGACY);
  });

  it('targets only the .MainActivity (does not create other activities)', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const m = emptyManifest();
    applyLauncherContract(m, options);

    const activities = getApplication(m).activity ?? [];
    expect(activities).toHaveLength(1);
    expect(activities[0].$['android:name']).toBe('.MainActivity');
    expect(activities[0].$['tools:node']).toBe('merge');
  });

  it('does not duplicate the immersive intent-filter on repeat application', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const m = emptyManifest();
    applyLauncherContract(m, options);
    applyLauncherContract(m, options);
    applyLauncherContract(m, options);

    expect(getImmersiveIntentFilters(m)).toHaveLength(1);

    // And the single filter must not have duplicate categories.
    const filter = getImmersiveIntentFilters(m)[0];
    const categories = filter.category.map((c: any) => c.$?.['android:name']);
    const unique = new Set(categories);
    expect(categories).toHaveLength(unique.size);
  });

  it('replaces the filter when appType toggles between vr and mr', () => {
    const m = emptyManifest();
    applyLauncherContract(m, resolveOptions({ xrMode: 'pico-os5', appType: 'vr' }));
    applyLauncherContract(m, resolveOptions({ xrMode: 'pico-os5', appType: 'mr' }));

    expect(getImmersiveIntentFilters(m)).toHaveLength(1);
    const meta = getAppMeta(m, MANIFEST_META.PVR_APP_TYPE);
    expect(meta.$['android:value']).toBe('mr');
  });

  it('preserves a pre-existing MainActivity and its non-immersive intent-filters', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const m = emptyManifest();
    // Seed a pre-existing MainActivity with a MAIN+LAUNCHER filter, as the
    // user's own manifest would typically provide. Our addition should not
    // touch it.
    getApplication(m).activity.push({
      $: { 'android:name': '.MainActivity' },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
          category: [
            { $: { 'android:name': 'android.intent.category.LAUNCHER' } },
          ],
        },
      ],
    });

    applyLauncherContract(m, options);

    const activity = getApplication(m).activity.find(
      (a: any) => a.$?.['android:name'] === '.MainActivity'
    );
    expect(activity['intent-filter']).toHaveLength(2);
    // The original (non-immersive) filter must remain exactly as it was.
    const original = activity['intent-filter'].find(
      (f: any) =>
        Array.isArray(f.category) &&
        !f.category.some(
          (c: any) =>
            c.$?.['android:name'] === LAUNCHER_CATEGORIES.OPENXR_IMMERSIVE_HMD
        )
    );
    expect(original).toBeDefined();
    expect(original.category.map((c: any) => c.$?.['android:name'])).toEqual([
      'android.intent.category.LAUNCHER',
    ]);
  });
});

describe('applyLauncherContract — <queries> block', () => {
  it('adds PICO system packages to <queries>', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const m = emptyManifest();
    applyLauncherContract(m, options);

    const packages = getQueriesPackages(m);
    for (const pkg of PICO_QUERY_PACKAGES) {
      expect(packages).toContain(pkg);
    }
  });

  it('does not duplicate queries on repeat application', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const m = emptyManifest();
    applyLauncherContract(m, options);
    applyLauncherContract(m, options);

    const packages = getQueriesPackages(m);
    expect(packages).toHaveLength(PICO_QUERY_PACKAGES.length);
  });

  it('preserves unrelated queries already present', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const m = emptyManifest();
    (m.manifest as any).queries = [
      {
        package: [{ $: { 'android:name': 'com.example.other' } }],
      },
    ];

    applyLauncherContract(m, options);

    const packages = getQueriesPackages(m);
    expect(packages).toContain('com.example.other');
    for (const pkg of PICO_QUERY_PACKAGES) {
      expect(packages).toContain(pkg);
    }
  });
});

describe('applyLauncherContract — resolveOptions interaction', () => {
  it('defaults appType to vr for xrMode=pico-os5', () => {
    expect(resolveOptions({ xrMode: 'pico-os5' }).appType).toBe('vr');
  });

  it('defaults appType to vr for xrMode=pico-swan', () => {
    expect(resolveOptions({ xrMode: 'pico-swan' }).appType).toBe('vr');
  });

  it('defaults appType to 2d for xrMode=mobile', () => {
    expect(resolveOptions({ xrMode: 'mobile', buildVariant: 'mobile' }).appType).toBe('2d');
  });

  it('honors explicit appType override', () => {
    expect(resolveOptions({ xrMode: 'pico-swan', appType: 'mr' }).appType).toBe('mr');
    expect(resolveOptions({ xrMode: 'pico-os5', appType: '2d' }).appType).toBe('2d');
  });

  it('APP_TYPE_MANIFEST_VALUE maps every PicoAppType', () => {
    expect(APP_TYPE_MANIFEST_VALUE.vr).toBe('vr');
    expect(APP_TYPE_MANIFEST_VALUE.mr).toBe('mr');
    expect(APP_TYPE_MANIFEST_VALUE['2d']).toBe('2d');
  });
});
