/**
 * Phase J — reflection-based PICO Platform SDK detection.
 *
 * The Kotlin detector (`PicoPlatformSdkDetector`) wraps `Class.forName`;
 * it can only be exercised on a real or emulated device. These tests
 * cover the JS-side layer: the normalizer in `getPlatformSdkProbe`, the
 * boolean / string coercions in `isPlatformSdkPresent` /
 * `getPlatformSdkVersion`, and the composition of those values into
 * `getPicoRuntimeInfo`.
 */

const mockModule: {
  isPicoBuild: boolean;
  isPicoDevice: boolean;
  spatialMode: string;
  targetProfile: string;
  containerMode: string;
  xrMode: string;
  appType: string;
  picoAppId: string | null;
  picoAppKey: string | null;
  hasPlatformIdentity: boolean;
  hasIapIdentity: boolean;
  picoOsVersion: string | null;
  deviceModel: string | null;
  emulatorOptimizations: boolean;
  swanRuntimeInitialized: boolean;
  os5RuntimeInitialized: boolean;
  platformSdkPresent: boolean;
  platformSdkVersion: string | null;
  getPlatformSdkProbe: jest.Mock;
  hasSystemFeature?: jest.Mock;
  getDeclaredFeatures?: jest.Mock;
  getDeclaredPermissions?: jest.Mock;
} = {
  isPicoBuild: true,
  isPicoDevice: true,
  spatialMode: 'shared-space',
  targetProfile: 'pico4ultra',
  containerMode: 'window-container',
  xrMode: 'pico-os5',
  appType: 'vr',
  picoAppId: 'test-app-id',
  picoAppKey: 'test-app-key',
  hasPlatformIdentity: true,
  hasIapIdentity: false,
  picoOsVersion: '6.0.0',
  deviceModel: 'PICO 4 Ultra',
  emulatorOptimizations: false,
  swanRuntimeInitialized: false,
  os5RuntimeInitialized: true,
  platformSdkPresent: false,
  platformSdkVersion: null,
  getPlatformSdkProbe: jest.fn(async () => ({})),
};

jest.mock('expo', () => ({
  requireNativeModule: jest.fn(() => mockModule),
}));

import {
  getPicoRuntimeInfo,
  getPlatformSdkProbe,
  getPlatformSdkVersion,
  isPlatformSdkPresent,
} from '../index';

beforeEach(() => {
  mockModule.platformSdkPresent = false;
  mockModule.platformSdkVersion = null;
  mockModule.getPlatformSdkProbe = jest.fn(async () => ({}));
});

describe('isPlatformSdkPresent', () => {
  it('returns false when the SDK is absent', () => {
    mockModule.platformSdkPresent = false;
    expect(isPlatformSdkPresent()).toBe(false);
  });

  it('returns true when the native module reports presence', () => {
    mockModule.platformSdkPresent = true;
    expect(isPlatformSdkPresent()).toBe(true);
  });

  it('coerces undefined to false (native module stale/unloaded)', () => {
    mockModule.platformSdkPresent = undefined as unknown as boolean;
    expect(isPlatformSdkPresent()).toBe(false);
  });
});

describe('getPlatformSdkVersion', () => {
  it('returns the native version string when present', () => {
    mockModule.platformSdkVersion = '3.2.0';
    expect(getPlatformSdkVersion()).toBe('3.2.0');
  });

  it('returns null when the native module has no version', () => {
    mockModule.platformSdkVersion = null;
    expect(getPlatformSdkVersion()).toBeNull();
  });

  it('coerces undefined to null', () => {
    mockModule.platformSdkVersion = undefined as unknown as null;
    expect(getPlatformSdkVersion()).toBeNull();
  });
});

describe('getPlatformSdkProbe', () => {
  it('returns all-false shape when native returns empty map', async () => {
    mockModule.getPlatformSdkProbe = jest.fn(async () => ({}));
    const probe = await getPlatformSdkProbe();
    expect(probe).toEqual({
      account: false,
      iap: false,
      achievements: false,
      leaderboards: false,
      rooms: false,
      social: false,
      storage: false,
      subscription: false,
      notifications: false,
      rtc: false,
    });
  });

  it('forwards native true/false per surface', async () => {
    mockModule.getPlatformSdkProbe = jest.fn(async () => ({
      account: true,
      iap: true,
      notifications: false,
    }));
    const probe = await getPlatformSdkProbe();
    expect(probe.account).toBe(true);
    expect(probe.iap).toBe(true);
    expect(probe.notifications).toBe(false);
    // Surfaces not reported by native must still appear as false
    // rather than undefined, so consumers can destructure safely.
    expect(probe.achievements).toBe(false);
    expect(probe.leaderboards).toBe(false);
    expect(probe.rooms).toBe(false);
    expect(probe.rtc).toBe(false);
  });

  it('ignores extra keys the native module returns (forward compat)', async () => {
    mockModule.getPlatformSdkProbe = jest.fn(async () => ({
      account: true,
      speech: true, // hypothetical future surface
      haptics: true,
    }));
    const probe = await getPlatformSdkProbe();
    expect(probe.account).toBe(true);
    // The typed shape does not include `speech` / `haptics` — the
    // normalizer only emits known keys. Consumers wanting the raw
    // map can call ExpoPicoModule.getPlatformSdkProbe() directly.
    expect((probe as Record<string, boolean>).speech).toBeUndefined();
  });

  it('returns the all-false shape if native returns null (defensive)', async () => {
    mockModule.getPlatformSdkProbe = jest.fn(async () => null as unknown as Record<string, boolean>);
    const probe = await getPlatformSdkProbe();
    expect(Object.values(probe).every((v) => v === false)).toBe(true);
  });
});

describe('getPicoRuntimeInfo — Phase J fields', () => {
  it('surfaces platformSdkPresent and platformSdkVersion', () => {
    mockModule.platformSdkPresent = true;
    mockModule.platformSdkVersion = '3.2.0';
    const info = getPicoRuntimeInfo();
    expect(info.platformSdkPresent).toBe(true);
    expect(info.platformSdkVersion).toBe('3.2.0');
  });

  it('defaults to false / null when native reports absence', () => {
    mockModule.platformSdkPresent = false;
    mockModule.platformSdkVersion = null;
    const info = getPicoRuntimeInfo();
    expect(info.platformSdkPresent).toBe(false);
    expect(info.platformSdkVersion).toBeNull();
  });
});
