import { resolveOptions } from '../plugin/src/types';
import {
  runDiagnosticChecks,
  type DiagnosticCheckFinding,
} from '../plugin/src/withPicoDiagnostics';

function ids(findings: DiagnosticCheckFinding[]): string[] {
  return findings.map((f) => f.id);
}

describe('runDiagnosticChecks — reducer is pure', () => {
  it('returns no findings for a well-formed pico-os5 config', () => {
    expect(
      runDiagnosticChecks(
        resolveOptions({
          xrMode: 'pico-os5',
          appType: 'vr',
          platformService: { picoAppId: 'APP', picoAppKey: 'KEY' },
        })
      )
    ).toEqual([]);
  });

  it('returns no findings for a clean mobile config', () => {
    expect(runDiagnosticChecks(resolveOptions({ buildVariant: 'mobile' }))).toEqual([]);
  });

  it('is deterministic — same input produces same finding ids in same order', () => {
    const opts = resolveOptions({
      xrMode: 'pico-swan',
      appType: 'vr',
      handTracking: true,
    });
    const a = runDiagnosticChecks(opts);
    const b = runDiagnosticChecks(opts);
    expect(ids(a)).toEqual(ids(b));
  });
});

describe('runDiagnosticChecks — each finding has the expected stable id', () => {
  it('identity.missing fires on immersive without identity', () => {
    const f = runDiagnosticChecks(resolveOptions({ xrMode: 'pico-os5' }));
    expect(ids(f)).toContain('identity.missing');
    const match = f.find((x) => x.id === 'identity.missing')!;
    expect(match.severity).toBe('warning');
  });

  it('appType.hidden-launcher fires on 2d with pico xrMode', () => {
    const f = runDiagnosticChecks(
      resolveOptions({
        xrMode: 'pico-os5',
        appType: '2d',
        platformService: { picoAppId: 'APP' },
      })
    );
    expect(ids(f)).toContain('appType.hidden-launcher');
    expect(
      f.find((x) => x.id === 'appType.hidden-launcher')!.severity
    ).toBe('info');
  });

  it('build-variant.ignored-apptype fires on mobile buildVariant + immersive appType', () => {
    const f = runDiagnosticChecks(
      resolveOptions({ buildVariant: 'mobile', appType: 'vr' })
    );
    expect(ids(f)).toContain('build-variant.ignored-apptype');
  });

  it('capabilities.ignored-under-mobile names enabled toggles', () => {
    const f = runDiagnosticChecks(
      resolveOptions({
        buildVariant: 'mobile',
        xrMode: 'mobile',
        handTracking: true,
        eyeTracking: true,
        foveatedRendering: true,
      })
    );
    const match = f.find((x) => x.id === 'capabilities.ignored-under-mobile')!;
    expect(match).toBeDefined();
    expect(match.message).toContain('handTracking');
    expect(match.message).toContain('eyeTracking');
    expect(match.message).toContain('foveatedRendering');
  });

  it('swan.subproject-without-mode fires on swanRuntimeProject + non-Swan xrMode', () => {
    const f = runDiagnosticChecks(
      resolveOptions({
        xrMode: 'pico-os5',
        platformService: { picoAppId: 'APP' },
        picoSwan: {
          swanRuntimeProject: { name: 'pico_swan_runtime', path: '../swan' },
        },
      })
    );
    expect(ids(f)).toContain('swan.subproject-without-mode');
  });

  it('refresh-rates.ignored-under-mobile fires on non-empty refreshRates under mobile', () => {
    const f = runDiagnosticChecks(
      resolveOptions({ buildVariant: 'mobile', xrMode: 'mobile', refreshRates: [72, 90] })
    );
    expect(ids(f)).toContain('refresh-rates.ignored-under-mobile');
  });

  it('iap.partial-identity distinguishes CN and Global region partials', () => {
    // CN-only partial
    const cn = runDiagnosticChecks(
      resolveOptions({
        xrMode: 'pico-os5',
        platformService: { picoAppId: 'APP', picoMerchantId: 'M' },
      })
    );
    const cnMatch = cn.find((x) => x.id === 'iap.partial-identity')!;
    expect(cnMatch).toBeDefined();
    expect(cnMatch.message).toContain('CN');
    expect(cnMatch.message).not.toContain('Global');

    // Foreign-only partial
    const fg = runDiagnosticChecks(
      resolveOptions({
        xrMode: 'pico-os5',
        platformService: {
          picoAppId: 'APP',
          foreign: { picoPayKey: 'FP' },
        },
      })
    );
    const fgMatch = fg.find((x) => x.id === 'iap.partial-identity')!;
    expect(fgMatch).toBeDefined();
    expect(fgMatch.message).toContain('Global/foreign');
  });
});

describe('runDiagnosticChecks — finding shape', () => {
  it('every finding has id + severity + non-empty message', () => {
    const all = runDiagnosticChecks(
      resolveOptions({
        xrMode: 'pico-os5',
        buildVariant: 'mobile',
        appType: 'vr',
        platformService: { picoAppId: 'APP', picoMerchantId: 'M' },
        handTracking: true,
        refreshRates: [72],
        picoSwan: { swanRuntimeProject: { name: 'x', path: '../y' } },
      })
    );
    // We should have surfaced a healthy handful of findings given this
    // intentionally bad config — at least 3.
    expect(all.length).toBeGreaterThanOrEqual(3);
    for (const f of all) {
      expect(typeof f.id).toBe('string');
      expect(f.id.length).toBeGreaterThan(0);
      expect(['error', 'warning', 'info']).toContain(f.severity);
      expect(typeof f.message).toBe('string');
      expect(f.message.length).toBeGreaterThan(0);
    }
  });
});
