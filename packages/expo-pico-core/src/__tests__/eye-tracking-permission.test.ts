// enterImmersiveScene() asks for the eye tracking permission before it starts
// the immersive activity. The native module and PermissionsAndroid are both
// mocked; each test loads a fresh copy of the package so the once-per-process
// guard starts clean.

const mockInfo: Record<string, unknown> = {};
let mockDeclared: Array<{ name: string; granted: boolean }> = [];
const mockEnter = jest.fn(() => true);
const mockGetDeclaredPermissions = jest.fn(() => mockDeclared);

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn((name: string) =>
    name === 'PicoCoreV2'
      ? {
          getInfo: () => mockInfo,
          getDeclaredPermissions: mockGetDeclaredPermissions,
          enterImmersiveScene: mockEnter,
        }
      : null
  ),
}));

const mockCheck = jest.fn<Promise<boolean>, [string]>();
const mockRequest = jest.fn<Promise<string>, [string]>();
const mockPlatform = { OS: 'android' };

jest.mock('react-native', () => {
  const stub = jest.requireActual('react-native');
  return {
    ...stub,
    Platform: mockPlatform,
    PermissionsAndroid: {
      RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
      check: mockCheck,
      request: mockRequest,
    },
  };
});

const HORIZON = 'com.oculus.permission.EYE_TRACKING';
const PICO = 'com.picovr.permission.EYE_TRACKING';

type Core = typeof import('../index');

function load(xrMode: string): Core {
  mockInfo.xrMode = xrMode;
  let core!: Core;
  jest.isolateModules(() => {
    core = require('../index');
  });
  core.registerImmersiveScene(() => null);
  return core;
}

let warn: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform.OS = 'android';
  mockDeclared = [];
  mockCheck.mockResolvedValue(false);
  mockRequest.mockResolvedValue('granted');
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => warn.mockRestore());

describe('enterImmersiveScene() eye tracking permission', () => {
  it('requests the Horizon permission when declared and not granted', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    const core = load('quest');

    await expect(core.enterImmersiveScene()).resolves.toBe(true);

    expect(mockCheck).toHaveBeenCalledWith(HORIZON);
    expect(mockRequest).toHaveBeenCalledWith(HORIZON);
    expect(mockRequest.mock.invocationCallOrder[0]).toBeLessThan(
      mockEnter.mock.invocationCallOrder[0]
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not request when the permission is already granted', async () => {
    mockDeclared = [{ name: HORIZON, granted: true }];
    mockCheck.mockResolvedValue(true);
    const core = load('quest');

    await expect(core.enterImmersiveScene()).resolves.toBe(true);

    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('does not request when the manifest does not declare it', async () => {
    mockDeclared = [{ name: 'android.permission.CAMERA', granted: false }];
    const core = load('quest');

    await core.enterImmersiveScene();

    expect(mockCheck).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('never requests on the mobile flavor', async () => {
    mockDeclared = [
      { name: HORIZON, granted: false },
      { name: PICO, granted: false },
    ];
    const core = load('mobile');

    await core.enterImmersiveScene();

    expect(mockGetDeclaredPermissions).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('never requests off Android', async () => {
    mockPlatform.OS = 'ios';
    mockDeclared = [{ name: HORIZON, granted: false }];
    const core = load('quest');

    await core.enterImmersiveScene();

    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('asks for the PICO permission on PICO builds, never the Horizon one', async () => {
    mockDeclared = [
      { name: HORIZON, granted: false },
      { name: PICO, granted: false },
    ];
    const core = load('pico-os5');

    await core.enterImmersiveScene();

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith(PICO);
  });

  it('still enters the scene after a denial, and logs it', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    mockRequest.mockResolvedValue('denied');
    const core = load('quest');

    await expect(core.enterImmersiveScene()).resolves.toBe(true);

    expect(mockEnter).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`${HORIZON} was denied`));
  });

  it('still enters the scene when the request throws', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    mockRequest.mockRejectedValue(new Error('no activity'));
    const core = load('quest');

    await expect(core.enterImmersiveScene()).resolves.toBe(true);

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('retries on the next launch when the request failed before reaching the user', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    mockRequest.mockRejectedValueOnce(new Error('no activity'));
    const core = load('quest');

    await core.enterImmersiveScene();
    await core.enterImmersiveScene();
    await core.enterImmersiveScene();

    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(mockEnter).toHaveBeenCalledTimes(3);
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

  it('asks once per process, so "never ask again" is not re-prompted', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    mockRequest.mockResolvedValue('never_ask_again');
    const core = load('quest');

    await core.enterImmersiveScene();
    await core.enterImmersiveScene();
    await core.enterImmersiveScene();

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockEnter).toHaveBeenCalledTimes(3);
  });

  it('does not ask when no scene is registered and the launch is refused', async () => {
    mockDeclared = [{ name: HORIZON, granted: false }];
    mockInfo.xrMode = 'quest';
    // An isolated registry gets a fresh AppRegistry with nothing registered.
    let core!: Core;
    jest.isolateModules(() => {
      core = require('../index');
    });
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(core.enterImmersiveScene()).resolves.toBe(false);

    expect(mockRequest).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
