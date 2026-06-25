import { WarningAggregator } from '@expo/config-plugins';

import { resolveOptions } from '../plugin/src/types';
import { withPicoDiagnostics } from '../plugin/src/withPicoDiagnostics';

type WarnCall = { tag: string; message: string };

function runDiagnostics(input: Parameters<typeof resolveOptions>[0]): WarnCall[] {
  const calls: WarnCall[] = [];
  const spy = jest
    .spyOn(WarningAggregator, 'addWarningAndroid')
    .mockImplementation((tag: string, message: string) => {
      calls.push({ tag, message });
    });
  try {
    const resolved = resolveOptions(input);
    withPicoDiagnostics({} as any, resolved);
  } finally {
    spy.mockRestore();
  }
  return calls;
}

describe('withPicoDiagnostics — clean config', () => {
  it('emits no warnings for a well-formed pico-os5 build with identity', () => {
    const calls = runDiagnostics({
      xrMode: 'pico-os5',
      appType: 'vr',
      platformService: { picoAppId: 'APP', picoAppKey: 'KEY' },
    });
    expect(calls).toHaveLength(0);
  });

  it('emits no warnings for a well-formed pico-swan build with identity', () => {
    const calls = runDiagnostics({
      xrMode: 'pico-swan',
      appType: 'mr',
      platformService: { picoAppId: 'APP', picoAppKey: 'KEY' },
    });
    expect(calls).toHaveLength(0);
  });

  it('emits no warnings for a clean mobile-only build', () => {
    const calls = runDiagnostics({ buildVariant: 'mobile' });
    expect(calls).toHaveLength(0);
  });
});

describe('withPicoDiagnostics — immersive without identity', () => {
  it('warns when xrMode=pico-os5 and no picoAppId is set', () => {
    const calls = runDiagnostics({ xrMode: 'pico-os5' });
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0].message).toMatch(/picoAppId is empty/);
  });

  it('warns when xrMode=pico-swan and no picoAppId is set', () => {
    const calls = runDiagnostics({ xrMode: 'pico-swan' });
    expect(calls.some((c) => c.message.includes('picoAppId'))).toBe(true);
  });

  it('does not warn when legacy top-level picoAppId is set', () => {
    const calls = runDiagnostics({ xrMode: 'pico-os5', picoAppId: 'LEGACY' });
    expect(
      calls.some((c) => c.message.includes('picoAppId is empty'))
    ).toBe(false);
  });
});

describe('withPicoDiagnostics — 2d appType with pico xrMode', () => {
  it('warns that the APK will not appear in the immersive launcher', () => {
    const calls = runDiagnostics({
      xrMode: 'pico-os5',
      appType: '2d',
      platformService: { picoAppId: 'APP' },
    });
    expect(
      calls.some((c) => c.message.includes("appType '2d'"))
    ).toBe(true);
  });
});

describe('withPicoDiagnostics — immersive appType with mobile buildVariant', () => {
  it('warns that no flavor manifest will be written', () => {
    const calls = runDiagnostics({
      buildVariant: 'mobile',
      appType: 'vr',
    });
    expect(
      calls.some((c) => c.message.includes("buildVariant 'mobile'"))
    ).toBe(true);
  });
});

describe('withPicoDiagnostics — XR capability toggles under mobile xrMode', () => {
  it('warns and names the enabled toggles', () => {
    const calls = runDiagnostics({
      buildVariant: 'mobile',
      xrMode: 'mobile',
      handTracking: true,
      eyeTracking: true,
      foveatedRendering: true,
    });
    const toggleWarning = calls.find((c) =>
      c.message.includes('have no effect')
    );
    expect(toggleWarning).toBeDefined();
    expect(toggleWarning!.message).toContain('handTracking');
    expect(toggleWarning!.message).toContain('eyeTracking');
    expect(toggleWarning!.message).toContain('foveatedRendering');
  });

  it('does not warn when no capability toggles are enabled', () => {
    const calls = runDiagnostics({ buildVariant: 'mobile', xrMode: 'mobile' });
    expect(
      calls.some((c) => c.message.includes('have no effect'))
    ).toBe(false);
  });
});

describe('withPicoDiagnostics — Swan subproject without Swan xrMode', () => {
  it('warns when swanRuntimeProject is set but xrMode is pico-os5', () => {
    const calls = runDiagnostics({
      xrMode: 'pico-os5',
      platformService: { picoAppId: 'APP' },
      picoSwan: {
        swanRuntimeProject: { name: 'pico_swan_runtime', path: '../swan' },
      },
    });
    expect(
      calls.some((c) => c.message.includes('picoSwan.swanRuntimeProject'))
    ).toBe(true);
  });

  it('does not warn when swanRuntimeProject is set and xrMode is pico-swan', () => {
    const calls = runDiagnostics({
      xrMode: 'pico-swan',
      platformService: { picoAppId: 'APP' },
      picoSwan: {
        swanRuntimeProject: { name: 'pico_swan_runtime', path: '../swan' },
      },
    });
    expect(
      calls.some((c) => c.message.includes('picoSwan.swanRuntimeProject'))
    ).toBe(false);
  });
});

describe('withPicoDiagnostics — refreshRates under mobile xrMode', () => {
  it('warns when refreshRates are declared on a mobile build', () => {
    const calls = runDiagnostics({
      buildVariant: 'mobile',
      xrMode: 'mobile',
      refreshRates: [72, 90],
    });
    expect(
      calls.some((c) => c.message.includes('com.pico.refreshRates'))
    ).toBe(true);
  });
});

describe('withPicoDiagnostics — partial IAP identity', () => {
  it('warns when only picoMerchantId is set', () => {
    const calls = runDiagnostics({
      xrMode: 'pico-os5',
      platformService: { picoAppId: 'APP', picoMerchantId: 'M' },
    });
    expect(
      calls.some((c) => c.message.includes('IAP identity is partially populated'))
    ).toBe(true);
  });

  it('warns when only foreign.picoPayKey is set', () => {
    const calls = runDiagnostics({
      xrMode: 'pico-os5',
      platformService: {
        picoAppId: 'APP',
        foreign: { picoPayKey: 'FP' },
      },
    });
    const partial = calls.find((c) =>
      c.message.includes('IAP identity is partially populated')
    );
    expect(partial).toBeDefined();
    expect(partial!.message).toContain('Global/foreign');
  });

  it('does not warn when both merchant and pay key are present', () => {
    const calls = runDiagnostics({
      xrMode: 'pico-os5',
      platformService: {
        picoAppId: 'APP',
        picoMerchantId: 'M',
        picoPayKey: 'P',
      },
    });
    expect(
      calls.some((c) => c.message.includes('IAP identity is partially populated'))
    ).toBe(false);
  });
});
