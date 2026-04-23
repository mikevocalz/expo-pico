// The diagnostics module imports ExpoPicoModule (which calls
// `requireNativeModule` at import time). Jest runs in Node with no
// native bridge, so stub the module before the import chain resolves.
// We only test the pure reducer + formatter here, neither of which
// touches the native mock, so returning an empty object is enough.
jest.mock('expo', () => ({
  requireNativeModule: jest.fn(() => ({})),
}));

import {
  buildDiagnosticsReport,
  formatDiagnostics,
  type BuildTimeFacts,
  type RuntimeFacts,
} from '../diagnostics';

function build(overrides: Partial<BuildTimeFacts> = {}): BuildTimeFacts {
  return {
    xrMode: 'pico-os6',
    appType: 'vr',
    isPicoDevice: true,
    isPicoBuild: true,
    hasPlatformIdentity: true,
    hasIapIdentity: false,
    swanRuntimeInitialized: false,
    os6RuntimeInitialized: true,
    picoAppId: 'APP',
    picoAppKey: 'KEY',
    deviceModel: 'PICO 4',
    ...overrides,
  };
}

function runtime(overrides: Partial<RuntimeFacts> = {}): RuntimeFacts {
  return {
    declaredFeatures: [],
    declaredPermissions: [],
    systemFeatureHits: {},
    ...overrides,
  };
}

describe('buildDiagnosticsReport — clean baseline', () => {
  it('returns no findings when everything is aligned', () => {
    const report = buildDiagnosticsReport(build(), runtime());
    expect(report.findings).toEqual([]);
    expect(report.summary.hasError).toBe(false);
    expect(report.summary.hasWarning).toBe(false);
  });

  it('is a no-op for a clean mobile build', () => {
    const report = buildDiagnosticsReport(
      build({
        xrMode: 'mobile',
        appType: '2d',
        isPicoDevice: false,
        isPicoBuild: false,
        hasPlatformIdentity: false,
        os6RuntimeInitialized: false,
      }),
      runtime()
    );
    expect(report.findings).toEqual([]);
  });
});

describe('buildDiagnosticsReport — identity', () => {
  it('errors on immersive build without platform identity', () => {
    const report = buildDiagnosticsReport(
      build({ hasPlatformIdentity: false }),
      runtime()
    );
    const f = report.findings.find((x) => x.id === 'identity.missing');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('error');
    expect(report.summary.hasError).toBe(true);
  });

  it('does not error when appType is 2d (identity optional for companion builds)', () => {
    const report = buildDiagnosticsReport(
      build({ hasPlatformIdentity: false, appType: '2d' }),
      runtime()
    );
    expect(report.findings.find((x) => x.id === 'identity.missing')).toBeUndefined();
  });

  it('does not error for mobile xrMode even without identity', () => {
    const report = buildDiagnosticsReport(
      build({
        xrMode: 'mobile',
        appType: '2d',
        hasPlatformIdentity: false,
        isPicoBuild: false,
        isPicoDevice: false,
      }),
      runtime()
    );
    expect(report.findings).toEqual([]);
  });
});

describe('buildDiagnosticsReport — runtime initialization info', () => {
  it('emits info when Swan xrMode but runtime uninitialized', () => {
    const report = buildDiagnosticsReport(
      build({ xrMode: 'pico-swan', swanRuntimeInitialized: false }),
      runtime()
    );
    const f = report.findings.find((x) => x.id === 'swan.uninitialized');
    expect(f?.severity).toBe('info');
  });

  it('emits info when OS6 xrMode but runtime uninitialized', () => {
    const report = buildDiagnosticsReport(
      build({ xrMode: 'pico-os6', os6RuntimeInitialized: false }),
      runtime()
    );
    const f = report.findings.find((x) => x.id === 'os6.uninitialized');
    expect(f?.severity).toBe('info');
  });

  it('stays silent when runtime is initialized', () => {
    const report = buildDiagnosticsReport(
      build({ xrMode: 'pico-swan', swanRuntimeInitialized: true }),
      runtime()
    );
    expect(report.findings.find((x) => x.id === 'swan.uninitialized')).toBeUndefined();
  });
});

describe('buildDiagnosticsReport — build/device mismatch', () => {
  it('warns when pico build runs on a non-pico device', () => {
    const report = buildDiagnosticsReport(
      build({ isPicoBuild: true, isPicoDevice: false }),
      runtime()
    );
    const f = report.findings.find((x) => x.id === 'build-device-mismatch');
    expect(f?.severity).toBe('warning');
    expect(report.summary.hasWarning).toBe(true);
  });

  it('warns when mobile build runs on PICO hardware', () => {
    const report = buildDiagnosticsReport(
      build({
        xrMode: 'mobile',
        appType: '2d',
        isPicoBuild: false,
        isPicoDevice: true,
        hasPlatformIdentity: false,
        os6RuntimeInitialized: false,
      }),
      runtime()
    );
    const f = report.findings.find((x) => x.id === 'mobile-on-pico-device');
    expect(f?.severity).toBe('warning');
  });
});

describe('buildDiagnosticsReport — feature hit/miss', () => {
  it('errors when a required feature is missing from the device', () => {
    const report = buildDiagnosticsReport(
      build(),
      runtime({
        declaredFeatures: [{ name: 'pico.hardware.eyetracking', required: true }],
        systemFeatureHits: { 'pico.hardware.eyetracking': false },
      })
    );
    const f = report.findings.find(
      (x) => x.id === 'feature.missing:pico.hardware.eyetracking'
    );
    expect(f?.severity).toBe('error');
    expect(report.summary.missingSystemFeatureCount).toBe(1);
  });

  it('emits info (not error) when an optional feature is missing', () => {
    const report = buildDiagnosticsReport(
      build(),
      runtime({
        declaredFeatures: [{ name: 'pico.hardware.eyetracking', required: false }],
        systemFeatureHits: { 'pico.hardware.eyetracking': false },
      })
    );
    const f = report.findings.find(
      (x) => x.id === 'feature.optional-missing:pico.hardware.eyetracking'
    );
    expect(f?.severity).toBe('info');
    expect(report.summary.missingSystemFeatureCount).toBe(0);
  });

  it('stays silent when declared feature is present on the device', () => {
    const report = buildDiagnosticsReport(
      build(),
      runtime({
        declaredFeatures: [{ name: 'pico.hardware.handtracking', required: false }],
        systemFeatureHits: { 'pico.hardware.handtracking': true },
      })
    );
    expect(
      report.findings.some((x) => x.id.startsWith('feature.'))
    ).toBe(false);
  });
});

describe('buildDiagnosticsReport — permission grants', () => {
  it('emits info for ungranted runtime permissions', () => {
    const report = buildDiagnosticsReport(
      build(),
      runtime({
        declaredPermissions: [
          { name: 'android.permission.RECORD_AUDIO', granted: false },
        ],
      })
    );
    const f = report.findings.find(
      (x) => x.id === 'permission.ungranted:android.permission.RECORD_AUDIO'
    );
    expect(f?.severity).toBe('info');
  });

  it('skips telephony-strip permissions (tools:node="remove" leftover)', () => {
    const report = buildDiagnosticsReport(
      build(),
      runtime({
        declaredPermissions: [
          { name: 'android.permission.READ_PHONE_STATE', granted: false },
          { name: 'android.permission.CALL_PHONE', granted: false },
        ],
      })
    );
    expect(
      report.findings.some((x) => x.id.startsWith('permission.ungranted:'))
    ).toBe(false);
  });
});

describe('buildDiagnosticsReport — finding ordering', () => {
  it('sorts errors before warnings before info', () => {
    const report = buildDiagnosticsReport(
      build({ hasPlatformIdentity: false, isPicoBuild: true, isPicoDevice: false }),
      runtime({
        declaredFeatures: [{ name: 'pico.hardware.eyetracking', required: true }],
        systemFeatureHits: { 'pico.hardware.eyetracking': false },
      })
    );
    const severities = report.findings.map((f) => f.severity);
    // Errors first, then warnings, then info.
    const errorIdx = severities.indexOf('error');
    const warnIdx = severities.indexOf('warning');
    const infoIdx = severities.indexOf('info');
    if (errorIdx !== -1 && warnIdx !== -1) expect(errorIdx).toBeLessThan(warnIdx);
    if (warnIdx !== -1 && infoIdx !== -1) expect(warnIdx).toBeLessThan(infoIdx);
  });
});

describe('formatDiagnostics', () => {
  it('reports a clean state with feature counts', () => {
    const report = buildDiagnosticsReport(
      build(),
      runtime({
        declaredFeatures: [{ name: 'a', required: false }],
        declaredPermissions: [{ name: 'p', granted: true }],
        systemFeatureHits: { a: true },
      })
    );
    const out = formatDiagnostics(report);
    expect(out).toContain('no issues');
    expect(out).toContain('declared features: 1');
    expect(out).toContain('declared permissions: 1');
  });

  it('renders each finding with severity prefix and hint', () => {
    const report = buildDiagnosticsReport(
      build({ hasPlatformIdentity: false }),
      runtime()
    );
    const out = formatDiagnostics(report);
    expect(out).toContain('[ERROR]');
    expect(out).toContain('identity.missing');
    expect(out).toContain('platformService.picoAppId');
  });
});
