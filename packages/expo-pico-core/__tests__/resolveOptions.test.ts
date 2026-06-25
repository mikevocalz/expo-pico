import { resolveOptions, PICO_OPTION_DEFAULTS } from '../plugin/src/types';

describe('resolveOptions', () => {
  it('returns all defaults when called with empty object', () => {
    const result = resolveOptions({});
    expect(result).toEqual(PICO_OPTION_DEFAULTS);
  });

  it('returns all defaults when called with undefined', () => {
    const result = resolveOptions(undefined);
    expect(result).toEqual(PICO_OPTION_DEFAULTS);
  });

  it('merges user-provided options over defaults', () => {
    const result = resolveOptions({
      picoAppId: 'my-app-id',
      spatialMode: 'immersive',
      handTracking: true,
    });

    expect(result.picoAppId).toBe('my-app-id');
    expect(result.spatialMode).toBe('immersive');
    expect(result.handTracking).toBe(true);
    // Untouched defaults preserved
    expect(result.enabled).toBe(true);
    expect(result.buildVariant).toBe('pico');
    expect(result.passthrough).toBe(false);
  });

  it('preserves targetDevices when provided', () => {
    const result = resolveOptions({
      targetDevices: ['pico-4', 'pico-4-ultra'],
    });
    expect(result.targetDevices).toEqual(['pico-4', 'pico-4-ultra']);
  });

  it('defaults targetDevices to empty array', () => {
    const result = resolveOptions({});
    expect(result.targetDevices).toEqual([]);
  });

  it('respects enabled=false', () => {
    const result = resolveOptions({ enabled: false });
    expect(result.enabled).toBe(false);
  });

  it('respects buildVariant=mobile', () => {
    const result = resolveOptions({ buildVariant: 'mobile' });
    expect(result.buildVariant).toBe('mobile');
  });

  it('preserves SDK version overrides', () => {
    const result = resolveOptions({
      minSdkVersion: 33,
      targetSdkVersion: 35,
    });
    expect(result.minSdkVersion).toBe(33);
    expect(result.targetSdkVersion).toBe(35);
  });
});

describe('xrMode resolution', () => {
  it('defaults to pico-os5 when buildVariant is pico', () => {
    const result = resolveOptions({ buildVariant: 'pico' });
    expect(result.xrMode).toBe('pico-os5');
  });

  it('defaults to pico-os5 when buildVariant is dual', () => {
    const result = resolveOptions({ buildVariant: 'dual' });
    expect(result.xrMode).toBe('pico-os5');
  });

  it('defaults to mobile when buildVariant is mobile', () => {
    const result = resolveOptions({ buildVariant: 'mobile' });
    expect(result.xrMode).toBe('mobile');
  });

  it('respects explicit xrMode=pico-swan', () => {
    const result = resolveOptions({ xrMode: 'pico-swan' });
    expect(result.xrMode).toBe('pico-swan');
  });

  it('lifts minSdkVersion floor to Swan default (33) when xrMode=pico-swan', () => {
    const result = resolveOptions({ xrMode: 'pico-swan' });
    expect(result.minSdkVersion).toBe(33);
  });

  it('respects explicit minSdkVersion override even for Swan', () => {
    const result = resolveOptions({ xrMode: 'pico-swan', minSdkVersion: 34 });
    expect(result.minSdkVersion).toBe(34);
  });

  it('keeps minSdkVersion at 32 for pico-os5', () => {
    const result = resolveOptions({ xrMode: 'pico-os5' });
    expect(result.minSdkVersion).toBe(32);
  });
});

describe('spatialMode volume', () => {
  it('accepts and preserves the volume spatial mode', () => {
    const result = resolveOptions({ spatialMode: 'volume' });
    expect(result.spatialMode).toBe('volume');
  });

  it('accepts every documented spatial mode', () => {
    const modes: Array<'2d' | 'windowed' | 'shared-space' | 'full-space' | 'immersive' | 'volume'> = [
      '2d',
      'windowed',
      'shared-space',
      'full-space',
      'immersive',
      'volume',
    ];
    for (const m of modes) {
      expect(resolveOptions({ spatialMode: m }).spatialMode).toBe(m);
    }
  });
});

describe('picoSwan resolution', () => {
  it('applies defaults when picoSwan is omitted', () => {
    const result = resolveOptions({ xrMode: 'pico-swan' });
    expect(result.picoSwan.swanRuntimeProject).toBeNull();
    expect(result.picoSwan.swanSdkArtifact).toBeNull();
    expect(result.picoSwan.declareSpatialContainerCategory).toBe(true);
    expect(result.picoSwan.swanMinSdkVersion).toBe(33);
    expect(result.picoSwan.scaffoldSwanSourceSet).toBe(false);
  });

  it('preserves user-provided picoSwan fields', () => {
    const result = resolveOptions({
      xrMode: 'pico-swan',
      picoSwan: {
        swanRuntimeProject: { name: 'pico_swan_runtime', path: '../swan' },
        swanSdkArtifact: 'com.pvr.swan:pvr-swan-runtime:0.1.0',
        scaffoldSwanSourceSet: true,
      },
    });
    expect(result.picoSwan.swanRuntimeProject).toEqual({
      name: 'pico_swan_runtime',
      path: '../swan',
    });
    expect(result.picoSwan.swanSdkArtifact).toBe('com.pvr.swan:pvr-swan-runtime:0.1.0');
    expect(result.picoSwan.scaffoldSwanSourceSet).toBe(true);
  });
});
