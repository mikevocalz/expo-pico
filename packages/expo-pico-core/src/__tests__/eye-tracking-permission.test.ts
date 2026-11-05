// Meta's porting guide: "Hybrid apps that need eye tracking in immersive mode
// must declare the permission but only request it at runtime when the
// immersive activity launches." The root registered with
// registerImmersiveScene() asks when it mounts in the immersive activity;
// enterImmersiveScene(), which runs on the 2D panel, never asks.
//
// The request goes through the native requestImmersivePermission, never
// PermissionsAndroid: that one uses the React context's current activity,
// which can still be the 2D panel, and a dialog in the panel's task closes XR.
// The native module is mocked; each test loads a fresh copy of the package so
// the once-per-process guard starts clean.

import type { ReactElement } from 'react';

const mockInfo: Record<string, unknown> = {};
let mockDeclared: Array<{ name: string; granted: boolean }> = [];
const mockEnter = jest.fn(() => true);
const mockGetDeclaredPermissions = jest.fn(() => mockDeclared);
let mockFeatures = new Set<string>();
let mockPicoEyeTrackingDeclared = true;
const mockHasSystemFeature = jest.fn((name: string) => mockFeatures.has(name));
const mockRequest = jest.fn<Promise<string>, [string]>();

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    // Nitro V1: `new PicoCore()` resolves its class through getHybridClass.
    getHybridClass: jest.fn((name: string) =>
      name.endsWith('.PicoCore')
        ? function () {
            return {
              get xrMode() {
                return mockInfo.xrMode;
              },
              get declaredCapabilities() {
                return { eyeTracking: mockPicoEyeTrackingDeclared };
              },
              getDeclaredPermissions: async () => mockGetDeclaredPermissions(),
              hasSystemFeature: async (feature: string) => mockHasSystemFeature(feature),
              requestImmersivePermission: (permission: string) => mockRequest(permission),
              enterImmersiveScene: async () => mockEnter(),
            };
          }
        : function () {
            throw new Error('not in this suite');
          }
    ),
  },
}));

// No renderer here: run effects inline so the registered root can be called
// as a plain function, which is what mounting it does.
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: (effect: () => void) => effect(),
}));

const mockPermissionsAndroidRequest = jest.fn();
const mockPlatform = { OS: 'android' };

jest.mock('react-native', () => {
  const stub = jest.requireActual('react-native');
  return {
    ...stub,
    Platform: mockPlatform,
    PermissionsAndroid: { request: mockPermissionsAndroidRequest },
  };
});

const HORIZON = 'com.oculus.permission.EYE_TRACKING';
const PICO = 'com.picovr.permission.EYE_TRACKING';
const HORIZONOS = 'horizonos.permission.EYE_TRACKING';
const HORIZON_FEATURE = 'oculus.software.eye_tracking';
const PICO_FEATURE = 'pico.hardware.eyetracking';
const PICO_ALT_FEATURE = 'picovr.software.eye_tracking';

type Core = typeof import('../index');
type Root = (props: object) => ReactElement;

const Scene = () => null;

type Registry = { __getRegistrations: () => Map<string, () => Root> };

// The AppRegistry the freshly loaded package registered into.
let registry: Registry;

function load(xrMode: string): Core {
  mockInfo.xrMode = xrMode;
  let core!: Core;
  jest.isolateModules(() => {
    core = require('../index');
    registry = (require('react-native') as { AppRegistry: Registry }).AppRegistry;
  });
  core.registerImmersiveScene(Scene);
  return core;
}

/** What VRActivity does: look up the registered root and mount it. */
function mountImmersiveRoot(): ReactElement {
  const provider = registry.__getRegistrations().get('VRQuestScene');
  if (!provider) throw new Error('no immersive root registered');
  return provider()({});
}

/** Lets the fire-and-forget request inside the effect run to completion. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

let warn: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform.OS = 'android';
  mockDeclared = [];
  mockFeatures = new Set([HORIZON_FEATURE, PICO_FEATURE]);
  mockPicoEyeTrackingDeclared = true;
  mockRequest.mockResolvedValue('granted');
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => warn.mockRestore());

describe('enterImmersiveScene() on the 2D panel', () => {
  it('launches the immersive activity without asking for eye tracking', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    const core = load('quest');

    await expect(core.enterImmersiveScene()).resolves.toBe(true);
    await settle();

    expect(mockEnter).toHaveBeenCalledTimes(1);
    expect(mockGetDeclaredPermissions).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

describe('immersive root eye tracking permission', () => {
  it('requests the Horizon permission on mount when declared and not granted', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    load('quest');

    const element = mountImmersiveRoot();
    await settle();

    expect(element.type).toBe(Scene);
    expect(mockRequest).toHaveBeenCalledWith(HORIZON);
    expect(warn).not.toHaveBeenCalled();
  });

  it('never requests horizonos.permission.EYE_TRACKING, even when declared', async () => {
    mockDeclared = [
      { name: HORIZONOS, granted: false },
      { name: HORIZON, granted: false },
    ];
    load('quest');

    mountImmersiveRoot();
    await settle();

    expect(mockRequest.mock.calls).toEqual([[HORIZON]]);
  });

  it('renders the scene before the user answers the dialog', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    mockRequest.mockReturnValue(new Promise<string>(() => {}));
    load('quest');

    expect(mountImmersiveRoot().type).toBe(Scene);
  });

  it('does not request when the permission is already granted', async () => {
    mockDeclared = [{ name: HORIZON, granted: true }];
    load('quest');

    mountImmersiveRoot();
    await settle();

    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('does not request when the manifest does not declare it', async () => {
    mockDeclared = [{ name: 'android.permission.CAMERA', granted: false }];
    load('quest');

    mountImmersiveRoot();
    await settle();

    expect(mockHasSystemFeature).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('never requests on the mobile flavor', async () => {
    mockDeclared = [
      { name: HORIZON, granted: false },
      { name: PICO, granted: false },
    ];
    load('mobile');

    mountImmersiveRoot();
    await settle();

    expect(mockGetDeclaredPermissions).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('never requests off Android', async () => {
    mockPlatform.OS = 'ios';
    mockDeclared = [{ name: HORIZON, granted: false }];
    load('quest');

    mountImmersiveRoot();
    await settle();

    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('asks for the PICO permission on PICO builds, never the Horizon one', async () => {
    mockDeclared = [
      { name: HORIZON, granted: false },
      { name: PICO, granted: false },
    ];
    load('pico-os5');

    mountImmersiveRoot();
    await settle();

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith(PICO);
  });

  it('logs a denial and keeps the scene', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    mockRequest.mockResolvedValue('denied');
    load('quest');

    expect(mountImmersiveRoot().type).toBe(Scene);
    await settle();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`${HORIZON} was denied`));
  });

  it('logs a thrown request instead of rejecting', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    mockRequest.mockRejectedValue(new Error('no activity'));
    load('quest');

    mountImmersiveRoot();
    await settle();

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('retries on the next mount when the request failed before reaching the user', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    mockRequest.mockRejectedValueOnce(new Error('no activity'));
    load('quest');

    for (let i = 0; i < 3; i++) {
      mountImmersiveRoot();
      await settle();
    }

    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('asks once per process, so "never ask again" is not re-prompted on re-entry', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    mockRequest.mockResolvedValue('never_ask_again');
    load('quest');

    for (let i = 0; i < 3; i++) {
      mountImmersiveRoot();
      await settle();
    }

    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('keeps one request per permission across direct calls with different modes', async () => {
    mockDeclared = [
      { name: HORIZON, granted: false },
      { name: PICO, granted: false },
    ];
    const core = load('quest');

    await core.ensureEyeTrackingPermission('quest');
    await core.ensureEyeTrackingPermission('pico-os5');
    await core.ensureEyeTrackingPermission('quest');

    expect(mockRequest.mock.calls).toEqual([[HORIZON], [PICO]]);
  });
});

describe('immersive permission routing and device features', () => {
  it('asks through the immersive activity, never through PermissionsAndroid', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    load('quest');

    mountImmersiveRoot();
    await settle();

    expect(mockRequest).toHaveBeenCalledWith(HORIZON);
    expect(mockPermissionsAndroidRequest).not.toHaveBeenCalled();
  });

  it('does not ask on a Quest without eye tracking hardware (Quest 3S)', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    mockFeatures = new Set();
    load('quest');

    mountImmersiveRoot();
    await settle();

    expect(mockHasSystemFeature).toHaveBeenCalledWith(HORIZON_FEATURE);
    expect(mockRequest).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not ask on a PICO headset without eye tracking hardware (PICO 4 Ultra)', async () => {
    mockDeclared = [{ name: PICO, granted: false }];
    mockFeatures = new Set([HORIZON_FEATURE]);
    load('pico-os5');

    mountImmersiveRoot();
    await settle();

    expect(mockHasSystemFeature).toHaveBeenCalledWith(PICO_FEATURE);
    expect(mockHasSystemFeature).toHaveBeenCalledWith(PICO_ALT_FEATURE);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('asks on a PICO headset that reports only picovr.software.eye_tracking', async () => {
    mockDeclared = [{ name: PICO, granted: false }];
    mockFeatures = new Set([PICO_ALT_FEATURE]);
    load('pico-os5');

    mountImmersiveRoot();
    await settle();

    expect(mockRequest).toHaveBeenCalledWith(PICO);
  });

  it('does not ask on PICO when the build did not enable eyeTracking', async () => {
    mockDeclared = [{ name: PICO, granted: false }];
    mockPicoEyeTrackingDeclared = false;
    load('pico-os5');

    mountImmersiveRoot();
    await settle();

    expect(mockGetDeclaredPermissions).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('asks again on the next mount when the immersive activity was not alive', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    mockRequest.mockResolvedValueOnce('no_immersive_activity');
    load('quest');

    mountImmersiveRoot();
    await settle();
    mountImmersiveRoot();
    await settle();

    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(warn).not.toHaveBeenCalled();
  });

  it('keeps the scene and does not re-prompt after a denial', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    mockRequest.mockResolvedValue('denied');
    load('quest');

    for (let i = 0; i < 3; i++) {
      expect(mountImmersiveRoot().type).toBe(Scene);
      await settle();
    }

    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
