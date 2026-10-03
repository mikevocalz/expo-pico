// Event wiring for @expo-pico/social against PPS 1.0.x.
//
// PPS 1.0.x pushes launch-intent changes only (ISocialClient.
// setLaunchIntentChangeCallback). Friend presence, friend requests and
// received invites have no PPS listener, so those three JS listeners must not
// subscribe to native events that can never fire.
jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
}));

import { __resetHybridCache } from '@expo-pico/platform-service-common';
import {
  addFriendPresenceChangedListener,
  addFriendRequestReceivedListener,
  addInviteReceivedListener,
  addLaunchDetailsListener,
  getLaunchDetails,
  type PicoLaunchDetails,
} from '../src/index';

const { requireOptionalNativeModule } = jest.requireMock('expo-modules-core') as {
  requireOptionalNativeModule: jest.Mock;
};

const INVITE_LAUNCH: PicoLaunchDetails = {
  launchType: 'invite',
  launchResult: 'success',
  launchSource: 'invite_panel',
  deepLinkMessage: '',
  destinationApiName: 'lobby_main',
  trackingId: 'trk-1',
  lobbySessionId: 'lobby-1',
  matchSessionId: '',
  extra: '',
  clientAction: '',
};

function mockNativeModule(overrides: Record<string, unknown> = {}) {
  const remove = jest.fn();
  const module = {
    socialSdkAvailable: true,
    socialSdkVersion: '1.0.0',
    addListener: jest.fn(() => ({ remove })),
    ...overrides,
  };
  requireOptionalNativeModule.mockReturnValue(module);
  return { module, remove };
}

// The test tsconfig has no DOM or Node types; console exists at runtime.
declare const console: { warn(...args: unknown[]): void };

let warn: jest.SpyInstance;

beforeEach(() => {
  __resetHybridCache();
  requireOptionalNativeModule.mockReset();
  requireOptionalNativeModule.mockReturnValue(null);
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe('listeners with no PPS 1.0.x push mechanism', () => {
  const cases: Array<[string, (cb: () => void) => { remove(): void }]> = [
    ['addFriendPresenceChangedListener', addFriendPresenceChangedListener],
    ['addFriendRequestReceivedListener', addFriendRequestReceivedListener],
    ['addInviteReceivedListener', addInviteReceivedListener],
  ];

  it.each(cases)('%s never subscribes to a native event', (_name, add) => {
    const { module } = mockNativeModule();
    const sub = add(() => {});
    expect(module.addListener).not.toHaveBeenCalled();
    expect(() => sub.remove()).not.toThrow();
  });

  it.each(cases.map(([name]) => name))('%s warns NOT_IN_PPS_1_0 once per method', async (name) => {
    // The warned-set is module-level, so load a fresh copy of the package.
    await jest.isolateModulesAsync(async () => {
      const fresh = (await import('../src/index')) as unknown as Record<
        string,
        (cb: () => void) => unknown
      >;
      fresh[name](() => {});
      fresh[name](() => {});
    });
    const calls = warn.mock.calls.filter((args) => String(args[0]).includes(`${name}()`));
    expect(calls).toHaveLength(1);
    expect(String(calls[0][0])).toContain('NOT_IN_PPS_1_0');
    expect(String(calls[0][0])).toContain('@expo-pico/social');
  });

  it('addInviteReceivedListener points callers at launch details', async () => {
    await jest.isolateModulesAsync(async () => {
      const fresh = await import('../src/index');
      fresh.addInviteReceivedListener(() => {});
    });
    expect(String(warn.mock.calls[0][0])).toContain('addLaunchDetailsListener');
  });
});

describe('addLaunchDetailsListener', () => {
  it('subscribes to onLaunchDetails on the native module', () => {
    const { module, remove } = mockNativeModule();
    const listener = jest.fn();

    const sub = addLaunchDetailsListener(listener);

    expect(module.addListener).toHaveBeenCalledTimes(1);
    expect(module.addListener).toHaveBeenCalledWith('onLaunchDetails', listener);
    sub.remove();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('delivers the payload native emits', () => {
    const { module } = mockNativeModule();
    const listener = jest.fn();
    addLaunchDetailsListener(listener);

    const [, registered] = module.addListener.mock.calls[0] as unknown as [
      string,
      (d: PicoLaunchDetails) => void,
    ];
    registered(INVITE_LAUNCH);

    expect(listener).toHaveBeenCalledWith(INVITE_LAUNCH);
  });

  it('returns a no-op subscription when PPS is absent', () => {
    mockNativeModule({ socialSdkAvailable: false });
    const sub = addLaunchDetailsListener(() => {});
    expect(() => sub.remove()).not.toThrow();
  });
});

describe('getLaunchDetails', () => {
  it('returns what the native module reports', () => {
    const getNative = jest.fn(() => INVITE_LAUNCH);
    mockNativeModule({ getLaunchDetails: getNative });

    expect(getLaunchDetails()).toEqual(INVITE_LAUNCH);
    expect(getNative).toHaveBeenCalledTimes(1);
  });

  it('reports a normal launch when the native module is missing', () => {
    expect(getLaunchDetails()).toMatchObject({ launchType: 'normal', launchResult: 'unknown' });
  });
});
