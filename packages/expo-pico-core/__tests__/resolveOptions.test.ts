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
