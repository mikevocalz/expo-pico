import type { AndroidConfig } from '@expo/config-plugins';

import {
  MANIFEST_META,
  PICO_FEATURES,
  PICO_PERMISSIONS,
} from '../plugin/src/constants';
import { resolveOptions } from '../plugin/src/types';
import { applyCapabilityContract } from '../plugin/src/withPicoCapabilities';

type Manifest = AndroidConfig.Manifest.AndroidManifest;

function emptyManifest(): Manifest {
  return {
    manifest: {
      $: {
        'xmlns:android': 'http://schemas.android.com/apk/res/android',
        'xmlns:tools': 'http://schemas.android.com/tools',
      },
      queries: [],
      'uses-feature': [],
      'uses-permission': [],
      application: [{ $: {}, 'meta-data': [] } as any],
    },
  } as Manifest;
}

function featureNames(m: Manifest): string[] {
  return ((m.manifest['uses-feature'] as any[]) ?? []).map(
    (f: any) => f.$?.['android:name']
  );
}

function permissionNames(m: Manifest): string[] {
  return ((m.manifest['uses-permission'] as any[]) ?? []).map(
    (p: any) => p.$?.['android:name']
  );
}

function metaValue(m: Manifest, name: string): string | undefined {
  const meta = (m.manifest.application![0] as any)['meta-data'] as any[];
  return meta.find((md: any) => md.$?.['android:name'] === name)?.$?.[
    'android:value'
  ];
}

describe('applyCapabilityContract — no-op default', () => {
  it('emits nothing when all capabilities are off', () => {
    const options = resolveOptions({});
    const m = emptyManifest();
    applyCapabilityContract(m, options);

    for (const feat of [
      PICO_FEATURES.EYE_TRACKING,
      PICO_FEATURES.FACE_TRACKING,
      PICO_FEATURES.BODY_TRACKING,
      PICO_FEATURES.SPATIAL_AUDIO,
      PICO_FEATURES.FOVEATION,
    ]) {
      expect(featureNames(m)).not.toContain(feat);
    }
    for (const perm of [
      PICO_PERMISSIONS.EYE_TRACKING,
      PICO_PERMISSIONS.FACE_TRACKING,
      PICO_PERMISSIONS.BODY_TRACKING,
      PICO_PERMISSIONS.HIGH_SAMPLING_RATE_SENSORS,
    ]) {
      expect(permissionNames(m)).not.toContain(perm);
    }
    expect(metaValue(m, MANIFEST_META.FOVEATION_ENABLED)).toBeUndefined();
    expect(metaValue(m, MANIFEST_META.REFRESH_RATES)).toBeUndefined();
  });
});

describe('applyCapabilityContract — eye tracking', () => {
  it('emits feature + permission when enabled', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ eyeTracking: true }));

    expect(featureNames(m)).toContain(PICO_FEATURES.EYE_TRACKING);
    expect(permissionNames(m)).toContain(PICO_PERMISSIONS.EYE_TRACKING);
  });

  it('marks the feature as required=false so non-tracking devices still install', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ eyeTracking: true }));

    const entry = (m.manifest['uses-feature'] as any[]).find(
      (f: any) => f.$?.['android:name'] === PICO_FEATURES.EYE_TRACKING
    );
    expect(entry.$['android:required']).toBe('false');
  });
});

describe('applyCapabilityContract — face / body / spatial-audio / foveation', () => {
  it('emits face tracking feature + permission', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ faceTracking: true }));
    expect(featureNames(m)).toContain(PICO_FEATURES.FACE_TRACKING);
    expect(permissionNames(m)).toContain(PICO_PERMISSIONS.FACE_TRACKING);
  });

  it('emits body tracking (seam) feature + permission', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ bodyTracking: true }));
    expect(featureNames(m)).toContain(PICO_FEATURES.BODY_TRACKING);
    expect(permissionNames(m)).toContain(PICO_PERMISSIONS.BODY_TRACKING);
  });

  it('emits spatial audio feature without a permission (seam)', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ spatialAudio: true }));
    expect(featureNames(m)).toContain(PICO_FEATURES.SPATIAL_AUDIO);
    // Spatial audio does not have an associated permission — confirm
    // the permission array is untouched beyond whatever the caller put
    // into it.
    expect(permissionNames(m).length).toBe(0);
  });

  it('emits foveation feature + meta-data', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ foveatedRendering: true }));

    expect(featureNames(m)).toContain(PICO_FEATURES.FOVEATION);
    expect(metaValue(m, MANIFEST_META.FOVEATION_ENABLED)).toBe('true');
  });
});

describe('applyCapabilityContract — high sampling rate sensors', () => {
  it('emits only the permission (no uses-feature)', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ highSamplingRateSensors: true }));

    expect(permissionNames(m)).toContain(PICO_PERMISSIONS.HIGH_SAMPLING_RATE_SENSORS);
    expect(featureNames(m)).toHaveLength(0);
  });
});

describe('applyCapabilityContract — refresh rates', () => {
  it('emits comma-separated rates in the meta-data value', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ refreshRates: [72, 90, 120] }));

    expect(metaValue(m, MANIFEST_META.REFRESH_RATES)).toBe('72,90,120');
  });

  it('skips emission when refreshRates is empty', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ refreshRates: [] }));

    expect(metaValue(m, MANIFEST_META.REFRESH_RATES)).toBeUndefined();
  });

  it('filters invalid entries (NaN, 0, negative) in the resolver', () => {
    const m = emptyManifest();
    applyCapabilityContract(
      m,
      resolveOptions({ refreshRates: [72, 0, -90, Number.NaN, 120] })
    );
    expect(metaValue(m, MANIFEST_META.REFRESH_RATES)).toBe('72,120');
  });

  it('rounds fractional rates (72.5 → 73)', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ refreshRates: [72.5, 120.2] }));
    expect(metaValue(m, MANIFEST_META.REFRESH_RATES)).toBe('73,120');
  });
});

describe('applyCapabilityContract — idempotency and toggle-off cleanup', () => {
  it('does not duplicate entries on repeat apply', () => {
    const options = resolveOptions({
      eyeTracking: true,
      faceTracking: true,
      highSamplingRateSensors: true,
      refreshRates: [72, 90],
    });
    const m = emptyManifest();
    applyCapabilityContract(m, options);
    applyCapabilityContract(m, options);
    applyCapabilityContract(m, options);

    const eyeFeatures = featureNames(m).filter(
      (n) => n === PICO_FEATURES.EYE_TRACKING
    );
    const eyePerms = permissionNames(m).filter(
      (n) => n === PICO_PERMISSIONS.EYE_TRACKING
    );
    expect(eyeFeatures).toHaveLength(1);
    expect(eyePerms).toHaveLength(1);

    const rateMetas = (
      (m.manifest.application![0] as any)['meta-data'] as any[]
    ).filter((md: any) => md.$?.['android:name'] === MANIFEST_META.REFRESH_RATES);
    expect(rateMetas).toHaveLength(1);
  });

  it('removes feature + permission when a capability is toggled off', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ eyeTracking: true }));
    expect(featureNames(m)).toContain(PICO_FEATURES.EYE_TRACKING);

    applyCapabilityContract(m, resolveOptions({ eyeTracking: false }));
    expect(featureNames(m)).not.toContain(PICO_FEATURES.EYE_TRACKING);
    expect(permissionNames(m)).not.toContain(PICO_PERMISSIONS.EYE_TRACKING);
  });

  it('removes refresh-rate meta when the list becomes empty', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ refreshRates: [90] }));
    expect(metaValue(m, MANIFEST_META.REFRESH_RATES)).toBe('90');

    applyCapabilityContract(m, resolveOptions({ refreshRates: [] }));
    expect(metaValue(m, MANIFEST_META.REFRESH_RATES)).toBeUndefined();
  });

  it('preserves tools:node="remove" permission entries when toggling off', () => {
    const m = emptyManifest();
    // Seed with a telephony-strip entry (what buildPicoManifest writes).
    (m.manifest['uses-permission'] as any[]).push({
      $: {
        'android:name': 'android.permission.READ_PHONE_STATE',
        'tools:node': 'remove',
      },
    });
    (m.manifest['uses-permission'] as any[]).push({
      $: { 'android:name': PICO_PERMISSIONS.EYE_TRACKING },
    });

    applyCapabilityContract(m, resolveOptions({ eyeTracking: false }));

    expect(permissionNames(m)).toContain('android.permission.READ_PHONE_STATE');
    expect(permissionNames(m)).not.toContain(PICO_PERMISSIONS.EYE_TRACKING);
  });
});

describe('applyCapabilityContract — boundary + scene mesh (Phase D)', () => {
  it('emits boundary feature + permission', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ boundary: true }));
    expect(featureNames(m)).toContain(PICO_FEATURES.BOUNDARY);
    expect(permissionNames(m)).toContain(PICO_PERMISSIONS.BOUNDARY);
  });

  it('emits scene mesh feature without a permission', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ sceneMesh: true }));
    expect(featureNames(m)).toContain(PICO_FEATURES.SCENE_MESH);
    expect(permissionNames(m)).not.toContain('com.picovr.permission.SCENE_MESH');
  });

  it('scene mesh is independent of sceneUnderstanding', () => {
    const m = emptyManifest();
    applyCapabilityContract(
      m,
      resolveOptions({ sceneMesh: true, sceneUnderstanding: false })
    );
    expect(featureNames(m)).toContain(PICO_FEATURES.SCENE_MESH);
    // sceneUnderstanding is handled by buildPicoManifest, not
    // applyCapabilityContract, so we don't assert on its feature here.
  });

  it('removes boundary feature + permission on toggle-off', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ boundary: true }));
    applyCapabilityContract(m, resolveOptions({ boundary: false }));
    expect(featureNames(m)).not.toContain(PICO_FEATURES.BOUNDARY);
    expect(permissionNames(m)).not.toContain(PICO_PERMISSIONS.BOUNDARY);
  });
});

describe('applyCapabilityContract — uses-native-library (Phase E)', () => {
  function nativeLibs(m: Manifest): Array<{ name: string; required: string }> {
    const app = m.manifest.application![0] as any;
    const list = (app['uses-native-library'] as any[]) ?? [];
    return list.map((e: any) => ({
      name: e.$?.['android:name'],
      required: e.$?.['android:required'],
    }));
  }

  it('emits libopenxr_loader.so (required=false) when openXrLoaderDeclaration is true', () => {
    const options = resolveOptions({ xrMode: 'pico-swan' });
    const m = emptyManifest();
    applyCapabilityContract(m, options);

    const libs = nativeLibs(m);
    expect(libs).toEqual([{ name: 'libopenxr_loader.so', required: 'false' }]);
  });

  it('does not emit native library when openXrLoaderDeclaration is false', () => {
    const options = resolveOptions({
      xrMode: 'pico-swan',
      openXrLoaderDeclaration: false,
    });
    const m = emptyManifest();
    applyCapabilityContract(m, options);

    expect(nativeLibs(m)).toHaveLength(0);
  });

  it('removes native library on toggle-off between applies', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ xrMode: 'pico-swan' }));
    expect(nativeLibs(m)).toHaveLength(1);

    applyCapabilityContract(
      m,
      resolveOptions({ xrMode: 'pico-swan', openXrLoaderDeclaration: false })
    );
    expect(nativeLibs(m)).toHaveLength(0);
  });

  it('does not duplicate native library on repeat apply', () => {
    const options = resolveOptions({ xrMode: 'pico-swan' });
    const m = emptyManifest();
    applyCapabilityContract(m, options);
    applyCapabilityContract(m, options);
    applyCapabilityContract(m, options);
    expect(nativeLibs(m)).toHaveLength(1);
  });

  it('defaults to no loader declaration under xrMode=mobile', () => {
    const m = emptyManifest();
    applyCapabilityContract(m, resolveOptions({ buildVariant: 'mobile' }));
    expect(nativeLibs(m)).toHaveLength(0);
  });
});

describe('applyCapabilityContract — combined capability fan-out', () => {
  it('emits every enabled capability simultaneously without cross-interference', () => {
    const options = resolveOptions({
      eyeTracking: true,
      faceTracking: true,
      bodyTracking: true,
      spatialAudio: true,
      foveatedRendering: true,
      highSamplingRateSensors: true,
      refreshRates: [72, 90, 120],
    });
    const m = emptyManifest();
    applyCapabilityContract(m, options);

    expect(featureNames(m).sort()).toEqual(
      [
        PICO_FEATURES.BODY_TRACKING,
        PICO_FEATURES.EYE_TRACKING,
        PICO_FEATURES.FACE_TRACKING,
        PICO_FEATURES.FOVEATION,
        PICO_FEATURES.SPATIAL_AUDIO,
      ].sort()
    );
    expect(permissionNames(m).sort()).toEqual(
      [
        PICO_PERMISSIONS.BODY_TRACKING,
        PICO_PERMISSIONS.EYE_TRACKING,
        PICO_PERMISSIONS.FACE_TRACKING,
        PICO_PERMISSIONS.HIGH_SAMPLING_RATE_SENSORS,
      ].sort()
    );
    expect(metaValue(m, MANIFEST_META.FOVEATION_ENABLED)).toBe('true');
    expect(metaValue(m, MANIFEST_META.REFRESH_RATES)).toBe('72,90,120');
  });
});
