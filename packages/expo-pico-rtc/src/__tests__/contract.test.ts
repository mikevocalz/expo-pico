// Mock native module as absent — simulates non-PICO build
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => {
      throw new Error('HybridObject not available in test environment');
    }),
  },
}));
jest.unmock('@expo-pico/platform-service-common');

import * as api from '../index';
import { PicoErrorCode, isPicoServiceError } from '@expo-pico/platform-service-common';

describe('expo-pico-rtc — SDK family contract', () => {

  // ── Service status / version ────────────────────────────────────────────────
  describe('service status contract', () => {
    it('getRtcServiceStatus is exported as a function', () => {
      expect(typeof api.getRtcServiceStatus).toBe('function');
    });

    it('getRtcServiceStatus() returns unavailable when SDK is absent', () => {
      expect(api.getRtcServiceStatus()).toBe('unavailable');
    });

    it('getRtcSdkVersion is exported as a function', () => {
      expect(typeof api.getRtcSdkVersion).toBe('function');
    });

    it('getRtcSdkVersion() returns null when SDK is absent', () => {
      expect(api.getRtcSdkVersion()).toBeNull();
    });
  });

  // ── Async methods throw PicoServiceError(SERVICE_UNAVAILABLE) ───────────────
  describe('async methods — SERVICE_UNAVAILABLE when native absent', () => {
    const asyncCases: Array<[string, unknown[]]> = [
      ['initRtcEngine', []],
      ['joinChannel', [{ channelId: 'ch', token: 'tok', uid: 1 }]],
      ['leaveChannel', []],
      ['muteLocalAudio', [true]],
      ['setAudioOutputVolume', [50]],
    ];

    for (const [name, args] of asyncCases) {
      it(`${name}() throws PicoServiceError with code SERVICE_UNAVAILABLE`, async () => {
        const fn = (api as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[name];
        expect(typeof fn).toBe('function');
        await expect(fn(...args)).rejects.toMatchObject({
          code: PicoErrorCode.SERVICE_UNAVAILABLE,
        });
      });

      it(`${name}() rejects with PicoServiceError instance`, async () => {
        const fn = (api as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[name];
        try {
          await fn(...args);
        } catch (e) {
          expect(isPicoServiceError(e)).toBe(true);
        }
      });
    }
  });

  // ── Event listeners return valid Subscription when unavailable ──────────────
  describe('event listeners — null-safe subscription', () => {
    const listenerMethods = [
      'addUserJoinedListener',
      'addUserLeftListener',
      'addRtcStateChangeListener',
    ] as const;

    for (const name of listenerMethods) {
      it(`${name}() returns an object with remove()`, () => {
        const fn = (api as unknown as Record<string, (cb: () => void) => unknown>)[name];
        expect(typeof fn).toBe('function');
        const sub = fn(() => {});
        expect(sub).toBeDefined();
        expect(typeof (sub as { remove: unknown }).remove).toBe('function');
      });

      it(`${name}() remove() does not throw`, () => {
        const fn = (api as unknown as Record<string, (cb: () => void) => { remove: () => void }>)[name];
        const sub = fn(() => {});
        expect(() => sub.remove()).not.toThrow();
      });
    }
  });

  // ── Export safety ────────────────────────────────────────────────────────────
  describe('export safety', () => {
    it('does not re-export raw Error constructor', () => {
      expect((api as Record<string, unknown>)['Error']).toBeUndefined();
    });

    it('exports getRtcServiceStatus and getRtcSdkVersion', () => {
      expect(api.getRtcServiceStatus).toBeDefined();
      expect(api.getRtcSdkVersion).toBeDefined();
    });
  });
});
