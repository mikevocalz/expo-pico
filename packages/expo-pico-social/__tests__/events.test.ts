// Event wiring for @expo-pico/social against PPS 1.0.x.
//
// PPS 1.0.x pushes launch-intent changes only (ISocialClient.
// setLaunchIntentChangeCallback). Friend presence, friend requests and
// received invites have no PPS listener, so those three JS listeners must not
// register anything on the HybridObject.
//
// The generated `#nitro/PicoSocial` module caches the class getHybridClass
// returns, so the mock hands out one constructor for the whole file and each
// test swaps the instance it produces through `__setHybrid`.
jest.mock('react-native-nitro-modules', () => {
  let current: object | null = null;
  function PicoSocial() {
    if (current === null) throw new Error('HybridObject not available in test environment');
    return current;
  }
  return {
    __setHybrid: (hybrid: object | null) => {
      current = hybrid;
    },
    NitroModules: { getHybridClass: jest.fn(() => PicoSocial) },
  };
});

import { __resetHybridCache } from '@expo-pico/platform-service-common';
import {
  addFriendPresenceChangedListener,
  addFriendRequestReceivedListener,
  addInviteReceivedListener,
  addLaunchDetailsListener,
  getLaunchDetails,
  type PicoLaunchDetails,
} from '../src/index';

const { __setHybrid } = jest.requireMock('react-native-nitro-modules') as {
  __setHybrid(hybrid: object | null): void;
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

// Stands in for the HybridObject that `new PicoSocial()` returns.
function mockHybrid(overrides: Record<string, unknown> = {}) {
  const hybrid = {
    available: true,
    sdkVersion: '1.0.0',
    addLaunchDetailsListener: jest.fn((_listener: (d: PicoLaunchDetails) => void) => 7),
    removeListener: jest.fn(),
    ...overrides,
  };
  __setHybrid(hybrid);
  return hybrid;
}

// The test tsconfig has no DOM or Node types; console exists at runtime.
declare const console: { warn(...args: unknown[]): void };

let warn: jest.SpyInstance;

beforeEach(() => {
  __resetHybridCache();
  __setHybrid(null);
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

  it.each(cases)('%s never registers on the HybridObject', (_name, add) => {
    const hybrid = mockHybrid();
    const sub = add(() => {});
    expect(hybrid.addLaunchDetailsListener).not.toHaveBeenCalled();
    expect(() => sub.remove()).not.toThrow();
    expect(hybrid.removeListener).not.toHaveBeenCalled();
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
  it('registers on the HybridObject and removes by id', () => {
    const hybrid = mockHybrid();
    const listener = jest.fn();

    const sub = addLaunchDetailsListener(listener);

    expect(hybrid.addLaunchDetailsListener).toHaveBeenCalledTimes(1);
    expect(hybrid.addLaunchDetailsListener).toHaveBeenCalledWith(listener);
    sub.remove();
    expect(hybrid.removeListener).toHaveBeenCalledWith(7);
    expect(warn).not.toHaveBeenCalled();
  });

  it('delivers the payload native emits', () => {
    const hybrid = mockHybrid();
    const listener = jest.fn();
    addLaunchDetailsListener(listener);

    const [registered] = hybrid.addLaunchDetailsListener.mock.calls[0];
    registered(INVITE_LAUNCH);

    expect(listener).toHaveBeenCalledWith(INVITE_LAUNCH);
  });

  it('returns a no-op subscription when PPS is absent', () => {
    const hybrid = mockHybrid({ available: false });
    const sub = addLaunchDetailsListener(() => {});
    expect(hybrid.addLaunchDetailsListener).not.toHaveBeenCalled();
    expect(() => sub.remove()).not.toThrow();
  });

  it('returns a no-op subscription when the native library is missing', () => {
    const sub = addLaunchDetailsListener(() => {});
    expect(() => sub.remove()).not.toThrow();
  });
});

describe('getLaunchDetails', () => {
  it('returns what the HybridObject reports', () => {
    const getNative = jest.fn(() => INVITE_LAUNCH);
    mockHybrid({ getLaunchDetails: getNative });

    expect(getLaunchDetails()).toEqual(INVITE_LAUNCH);
    expect(getNative).toHaveBeenCalledTimes(1);
  });

  it('reports a normal launch when the native library is missing', () => {
    expect(getLaunchDetails()).toMatchObject({ launchType: 'normal', launchResult: 'unknown' });
  });
});
