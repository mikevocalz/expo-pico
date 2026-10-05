// WindowContainer bridge + readiness mapping. index.ts caches the native
// module on first use, so each test loads a fresh copy through
// jest.isolateModules with its own requireOptionalNativeModule mock.

import { layoutReadinessFromProbe, type PicoSpatialLayoutBridgeStatus } from '../layout';

type Api = typeof import('../index');

function loadWithNative(native: Record<string, unknown> | null): Api {
  let api: Api | undefined;
  jest.isolateModules(() => {
    jest.doMock('expo-modules-core', () => ({
      requireOptionalNativeModule: (name: string) => (name === 'PicoSpatialV2' ? native : null),
    }));
    api = require('../index');
  });
  return api!;
}

function fakeNative(status: Partial<PicoSpatialLayoutBridgeStatus>, overrides = {}) {
  return {
    getSpatialSdkProbe: jest.fn(() => ({
      spatialUiScope: true,
      attachmentPanel: true,
      spatialNavigator: true,
      legacySpatialAnchors: false,
    })),
    getLayoutBridgeStatus: jest.fn(() => ({
      sdkLinked: false,
      spatialPlatform: false,
      reason: null,
      lastError: null,
      ...status,
    })),
    openWindowContainer: jest.fn(() => true),
    closeWindowContainer: jest.fn(() => true),
    ...overrides,
  };
}

afterEach(() => {
  jest.dontMock('expo-modules-core');
});

describe('layoutReadinessFromProbe', () => {
  const allClassesPresent = {
    spatialUiScope: true,
    attachmentPanel: true,
    spatialNavigator: true,
    legacySpatialAnchors: true,
  };

  it('reports nothing modern when there is no bridge status', () => {
    expect(layoutReadinessFromProbe(allClassesPresent)).toEqual({
      modernSpatialUiRuntimePresent: false,
      legacySpatialRuntimePresent: true,
      attachmentPanelRuntimePresent: false,
      spatialNavigatorRuntimePresent: false,
      spatialPlatform: false,
      nativeLayoutBridgeBound: false,
      bridgeReason: null,
    });
  });

  it('does not treat linked SDK classes as OS 6 on a non-spatial device', () => {
    const r = layoutReadinessFromProbe(allClassesPresent, {
      sdkLinked: true,
      spatialPlatform: false,
      reason: 'NOT_SPATIAL_PLATFORM',
      lastError: null,
    });
    expect(r.attachmentPanelRuntimePresent).toBe(false);
    expect(r.modernSpatialUiRuntimePresent).toBe(false);
    expect(r.spatialPlatform).toBe(false);
    expect(r.nativeLayoutBridgeBound).toBe(false);
  });

  it('binds only when the SDK is linked and the platform is spatial', () => {
    const r = layoutReadinessFromProbe(allClassesPresent, {
      sdkLinked: true,
      spatialPlatform: true,
      reason: null,
      lastError: null,
    });
    expect(r.nativeLayoutBridgeBound).toBe(true);
    expect(r.attachmentPanelRuntimePresent).toBe(true);
    expect(r.spatialPlatform).toBe(true);
  });

  it('keeps class-presence gating when the platform is spatial', () => {
    const r = layoutReadinessFromProbe(
      { attachmentPanel: false },
      { sdkLinked: true, spatialPlatform: true, reason: null, lastError: null }
    );
    expect(r.attachmentPanelRuntimePresent).toBe(false);
    expect(r.modernSpatialUiRuntimePresent).toBe(false);
  });
});

describe('getLayoutBridgeStatus', () => {
  it('reports NATIVE_MODULE_UNAVAILABLE when the module is missing', () => {
    const api = loadWithNative(null);
    const s = api.getLayoutBridgeStatus();
    expect(s).toMatchObject({ sdkLinked: false, spatialPlatform: false, lastError: null });
    expect(s.reason).toMatch(/^NATIVE_MODULE_UNAVAILABLE/);
  });

  it('reports NATIVE_BRIDGE_OUTDATED for a binary without the function', () => {
    const native = fakeNative({});
    delete (native as Partial<typeof native>).getLayoutBridgeStatus;
    const api = loadWithNative(native);
    expect(api.getLayoutBridgeStatus().reason).toMatch(/^NATIVE_BRIDGE_OUTDATED/);
  });

  it('passes the native status through and normalises missing fields', () => {
    const api = loadWithNative(
      fakeNative({ sdkLinked: true, spatialPlatform: false, reason: 'NOT_SPATIAL_PLATFORM: x' })
    );
    expect(api.getLayoutBridgeStatus()).toEqual({
      sdkLinked: true,
      spatialPlatform: false,
      reason: 'NOT_SPATIAL_PLATFORM: x',
      lastError: null,
    });
  });

  it('feeds getSpatialLayoutReadiness so OS 5 with the SDK linked stays unbound', () => {
    const api = loadWithNative(fakeNative({ sdkLinked: true, spatialPlatform: false }));
    const r = api.getSpatialLayoutReadiness();
    expect(r.nativeLayoutBridgeBound).toBe(false);
    expect(r.attachmentPanelRuntimePresent).toBe(false);
  });

  it('feeds getSpatialLayoutReadiness so OS 6 reads as bound', () => {
    const api = loadWithNative(fakeNative({ sdkLinked: true, spatialPlatform: true }));
    expect(api.getSpatialLayoutReadiness().nativeLayoutBridgeBound).toBe(true);
  });
});

describe('openWindowContainer / closeWindowContainer', () => {
  it('rejects without a native call when the module is missing', () => {
    const api = loadWithNative(null);
    const r = api.openWindowContainer('main');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/^NATIVE_MODULE_UNAVAILABLE/);
  });

  it('rejects an empty id before touching native', () => {
    const native = fakeNative({ sdkLinked: true, spatialPlatform: true });
    const api = loadWithNative(native);
    expect(api.openWindowContainer('  ')).toEqual({
      ok: false,
      reason: 'INVALID_ID: id must be a non-empty string.',
    });
    expect(native.openWindowContainer).not.toHaveBeenCalled();
  });

  it('returns the native reason and skips the SDK call on a non-spatial device', () => {
    const native = fakeNative({
      sdkLinked: true,
      spatialPlatform: false,
      reason: 'NOT_SPATIAL_PLATFORM: needs PICO OS 6',
    });
    const api = loadWithNative(native);
    expect(api.openWindowContainer('main')).toEqual({
      ok: false,
      reason: 'NOT_SPATIAL_PLATFORM: needs PICO OS 6',
    });
    expect(native.openWindowContainer).not.toHaveBeenCalled();
  });

  it('calls native with a null tag by default and returns ok', () => {
    const native = fakeNative({ sdkLinked: true, spatialPlatform: true });
    const api = loadWithNative(native);
    expect(api.openWindowContainer('main')).toEqual({ ok: true });
    expect(native.openWindowContainer).toHaveBeenCalledWith('main', null);
  });

  it('passes the tag through to close', () => {
    const native = fakeNative({ sdkLinked: true, spatialPlatform: true });
    const api = loadWithNative(native);
    expect(api.closeWindowContainer('main', { tag: 'second' })).toEqual({ ok: true });
    expect(native.closeWindowContainer).toHaveBeenCalledWith('main', 'second');
  });

  it('surfaces lastError when the SDK call fails', () => {
    let calls = 0;
    const native = fakeNative(
      {},
      {
        getLayoutBridgeStatus: jest.fn(() => ({
          sdkLinked: true,
          spatialPlatform: true,
          reason: null,
          lastError: calls++ === 0 ? null : "openWindowContainer('main') failed: boom",
        })),
        openWindowContainer: jest.fn(() => false),
      }
    );
    const api = loadWithNative(native);
    expect(api.openWindowContainer('main')).toEqual({
      ok: false,
      reason: "openWindowContainer('main') failed: boom",
    });
  });

  it('falls back to SDK_CALL_FAILED when native returns false with no lastError', () => {
    const native = fakeNative(
      { sdkLinked: true, spatialPlatform: true },
      { closeWindowContainer: jest.fn(() => false) }
    );
    const api = loadWithNative(native);
    const r = api.closeWindowContainer('main');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/^SDK_CALL_FAILED/);
  });

  it('reports NATIVE_BRIDGE_OUTDATED when the binary lacks the method', () => {
    const native = fakeNative({ sdkLinked: true, spatialPlatform: true });
    delete (native as Partial<typeof native>).openWindowContainer;
    const api = loadWithNative(native);
    const r = api.openWindowContainer('main');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/^NATIVE_BRIDGE_OUTDATED/);
  });
});
