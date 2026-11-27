// PICO Spatial SDK 6.2.8 made hand, mesh and plane tracking runtime grants:
// com.picovr.permission.HAND_TRACKING and com.picovr.permission.SPATIAL_DATA.
// The immersive root asks for them on mount, after eye tracking, and
// hand.enable() / scene.* ask before calling native. Requests go through the
// native requestImmersivePermission (Activity.requestPermissionStatus), never
// PermissionsAndroid. Each test loads a fresh copy of the package so the
// once-per-process guards start clean.

import type { ReactElement } from 'react';

const mockInfo: Record<string, unknown> = {};
let mockDeclared: Array<{ name: string; granted: boolean }> = [];
const mockGetDeclaredPermissions = jest.fn(() => mockDeclared);
const mockRequest = jest.fn<Promise<string>, [string]>();
const mockRuntime = {
  enableHandTracking: jest.fn(async () => true),
  getDetectedPlanes: jest.fn(async () => []),
  refreshScene: jest.fn(async () => true),
  refreshSceneMesh: jest.fn(async () => true),
  getSceneMeshTriangleCount: jest.fn(async () => 0),
};

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    getHybridClass: jest.fn((name: string) => {
      if (name.endsWith('.PicoCore')) {
        return function () {
          return {
            get xrMode() {
              return mockInfo.xrMode;
            },
            get declaredCapabilities() {
              return { eyeTracking: false };
            },
            getDeclaredPermissions: async () => mockGetDeclaredPermissions(),
            hasSystemFeature: async () => true,
            requestImmersivePermission: (permission: string) => mockRequest(permission),
          };
        };
      }
      if (name.endsWith('.PicoRuntime')) {
        return function () {
          return mockRuntime;
        };
      }
      return function () {
        throw new Error('not in this suite');
      };
    }),
  },
}));

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

const HAND = 'com.picovr.permission.HAND_TRACKING';
const SPATIAL = 'com.picovr.permission.SPATIAL_DATA';
const EYE = 'com.picovr.permission.EYE_TRACKING';

type Core = typeof import('../index');
type Root = (props: object) => ReactElement;
type Registry = { __getRegistrations: () => Map<string, () => Root> };

const Scene = () => null;
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

function mountImmersiveRoot(): ReactElement {
  const provider = registry.__getRegistrations().get('VRQuestScene');
  if (!provider) throw new Error('no immersive root registered');
  return provider()({});
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

let warn: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform.OS = 'android';
  mockDeclared = [];
  mockRequest.mockResolvedValue('granted');
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => warn.mockRestore());

describe('exports', () => {
  it('names the PICO permissions', () => {
    const core = load('pico-os5');
    expect(core.PICO_HAND_TRACKING_PERMISSION).toBe(HAND);
    expect(core.PICO_SPATIAL_DATA_PERMISSION).toBe(SPATIAL);
  });
});

describe('immersive root', () => {
  it.each(['pico-os5', 'pico-swan'])(
    'asks for hand tracking, then spatial data, on mount (%s)',
    async (mode) => {
      mockDeclared = [
        { name: HAND, granted: false },
        { name: SPATIAL, granted: false },
      ];
      load(mode);

      expect(mountImmersiveRoot().type).toBe(Scene);
      await settle();

      expect(mockRequest.mock.calls).toEqual([[HAND], [SPATIAL]]);
      expect(mockPermissionsAndroidRequest).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    }
  );

  it('asks one dialog at a time: spatial data waits for the hand answer', async () => {
    mockDeclared = [
      { name: HAND, granted: false },
      { name: SPATIAL, granted: false },
    ];
    let answerHand!: (status: string) => void;
    mockRequest.mockImplementationOnce(
      () => new Promise<string>((resolve) => (answerHand = resolve))
    );
    load('pico-os5');

    mountImmersiveRoot();
    await settle();
    expect(mockRequest.mock.calls).toEqual([[HAND]]);

    answerHand('granted');
    await settle();
    expect(mockRequest.mock.calls).toEqual([[HAND], [SPATIAL]]);
  });

  it('skips permissions the manifest does not declare or already grants', async () => {
    mockDeclared = [{ name: HAND, granted: true }];
    load('pico-os5');

    mountImmersiveRoot();
    await settle();

    expect(mockRequest).not.toHaveBeenCalled();
  });

  it.each(['quest', 'mobile'])('never asks on the %s flavor', async (mode) => {
    mockDeclared = [
      { name: HAND, granted: false },
      { name: SPATIAL, granted: false },
    ];
    load(mode);

    mountImmersiveRoot();
    await settle();

    expect(mockRequest.mock.calls.flat()).not.toContain(HAND);
    expect(mockRequest.mock.calls.flat()).not.toContain(SPATIAL);
  });

  it('asks once per process across re-mounts', async () => {
    mockDeclared = [{ name: HAND, granted: false }];
    mockRequest.mockResolvedValue('denied');
    load('pico-os5');

    mountImmersiveRoot();
    await settle();
    mountImmersiveRoot();
    await settle();

    expect(mockRequest.mock.calls).toEqual([[HAND]]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('no hand joints');
  });

  it('asks again when the first request never reached the user', async () => {
    mockDeclared = [{ name: SPATIAL, granted: false }];
    mockRequest.mockResolvedValueOnce('no_immersive_activity').mockResolvedValue('granted');
    load('pico-os5');

    mountImmersiveRoot();
    await settle();
    mountImmersiveRoot();
    await settle();

    expect(mockRequest.mock.calls).toEqual([[SPATIAL], [SPATIAL]]);
  });

  it('still asks for eye tracking first when it is declared', async () => {
    mockDeclared = [
      { name: EYE, granted: false },
      { name: HAND, granted: false },
    ];
    load('pico-os5');

    mountImmersiveRoot();
    await settle();

    // eyeTracking is off in declaredCapabilities, so the eye request is
    // skipped; hand tracking still goes out.
    expect(mockRequest.mock.calls).toEqual([[HAND]]);
  });
});

describe('runtime calls', () => {
  it('hand.enable() asks for HAND_TRACKING before enabling', async () => {
    mockDeclared = [{ name: HAND, granted: false }];
    const core = load('pico-os5');

    await core.capabilities.hand.enable();

    expect(mockRequest.mock.calls).toEqual([[HAND]]);
    expect(mockRuntime.enableHandTracking).toHaveBeenCalledTimes(1);
    expect(mockRequest.mock.invocationCallOrder[0]).toBeLessThan(
      mockRuntime.enableHandTracking.mock.invocationCallOrder[0]
    );
  });

  it.each([
    ['getPlanes', 'getDetectedPlanes'],
    ['refreshPlanes', 'refreshScene'],
    ['refreshMesh', 'refreshSceneMesh'],
    ['getMeshTriangleCount', 'getSceneMeshTriangleCount'],
  ] as const)('scene.%s() asks for SPATIAL_DATA before %s', async (method, nativeMethod) => {
    mockDeclared = [{ name: SPATIAL, granted: false }];
    const core = load('pico-os5');

    await core.capabilities.scene[method]();

    expect(mockRequest.mock.calls).toEqual([[SPATIAL]]);
    expect(mockRuntime[nativeMethod]).toHaveBeenCalledTimes(1);
  });

  it('runtime calls still run when the user denies the grant', async () => {
    mockDeclared = [{ name: HAND, granted: false }];
    mockRequest.mockResolvedValue('denied');
    const core = load('pico-os5');

    await expect(core.capabilities.hand.enable()).resolves.toBe(true);
    expect(mockRuntime.enableHandTracking).toHaveBeenCalledTimes(1);
  });

  it('a mount request and a runtime call share one dialog', async () => {
    mockDeclared = [{ name: HAND, granted: false }];
    const core = load('pico-os5');

    mountImmersiveRoot();
    await core.capabilities.hand.enable();
    await settle();

    expect(mockRequest.mock.calls).toEqual([[HAND]]);
  });
});
