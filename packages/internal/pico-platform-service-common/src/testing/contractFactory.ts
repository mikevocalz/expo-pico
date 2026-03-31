/**
 * Shared package contract test factory.
 *
 * Every hardened package in the expo-pico family must apply this factory in its
 * __tests__/contract.test.ts file. This ensures consistent verification of:
 * - availability method signatures
 * - typed error behavior for all async methods
 * - NOT_IMPLEMENTED behavior for all seam methods
 * - event listener null-safety
 *
 * @example
 * // packages/expo-pico-rooms/src/__tests__/contract.test.ts
 * jest.mock('expo', () => ({ requireNativeModule: jest.fn(() => { throw new Error(); }) }));
 * import * as api from '../index';
 * import { runPackageContractTests } from '@expo-pico/platform-service-common/testing';
 *
 * runPackageContractTests({
 *   packageName: 'expo-pico-rooms',
 *   api: api as Record<string, unknown>,
 *   availabilityMethod: 'isRoomsAvailable',
 *   versionMethod: 'getRoomsSdkVersion',
 *   asyncMethods: ['createRoom', 'joinRoom', 'leaveRoom'],
 *   listenerMethods: ['addRoomUpdatedListener'],
 *   seamMethods: ['requestMatchmaking'],
 * });
 */

import { isPicoServiceError, PicoErrorCode } from '../errors';
import type { PicoServiceError } from '../errors';

export interface PackageContractOptions {
  /** Human-readable package name for test labels */
  packageName: string;
  /** The package's full export surface (import * as api from '../index') */
  api: Record<string, unknown>;
  /** Name of the is{X}Available() method */
  availabilityMethod: string;
  /** Name of the get{X}SdkVersion() method */
  versionMethod: string;
  /**
   * Async methods that must throw SERVICE_UNAVAILABLE when native is absent.
   * Pass minimal required arguments (empty arrays/objects are fine for seam testing).
   */
  asyncMethods: Array<string | [string, ...unknown[]]>;
  /**
   * Event listener methods that must return a Subscription with remove() when unavailable.
   */
  listenerMethods: string[];
  /**
   * Async methods that are explicit NOT_IMPLEMENTED seams regardless of availability.
   */
  seamMethods?: Array<string | [string, ...unknown[]]>;
}

function getMethodEntry(entry: string | [string, ...unknown[]]): [string, unknown[]] {
  if (typeof entry === 'string') return [entry, []];
  const [name, ...args] = entry;
  return [name, args];
}

export function runPackageContractTests(opts: PackageContractOptions): void {
  const {
    packageName, api, availabilityMethod, versionMethod,
    asyncMethods, listenerMethods, seamMethods = [],
  } = opts;

  describe(`${packageName} — SDK family contract`, () => {

    // ── Availability ──────────────────────────────────────────────────────────
    describe('availability contract', () => {
      it(`${availabilityMethod} is exported as a function`, () => {
        expect(typeof api[availabilityMethod]).toBe('function');
      });

      it(`${availabilityMethod}() returns boolean`, () => {
        const result = (api[availabilityMethod] as () => unknown)();
        expect(typeof result).toBe('boolean');
      });

      it(`${availabilityMethod}() returns false when SDK is absent`, () => {
        expect((api[availabilityMethod] as () => boolean)()).toBe(false);
      });

      it(`${versionMethod} is exported as a function`, () => {
        expect(typeof api[versionMethod]).toBe('function');
      });

      it(`${versionMethod}() returns string`, () => {
        expect(typeof (api[versionMethod] as () => unknown)()).toBe('string');
      });

      it(`${versionMethod}() returns 'unavailable' when SDK is absent`, () => {
        expect((api[versionMethod] as () => string)()).toBe('unavailable');
      });
    });

    // ── Async methods throw PicoServiceError(SERVICE_UNAVAILABLE) ─────────────
    describe('async methods — SERVICE_UNAVAILABLE when native absent', () => {
      for (const entry of asyncMethods) {
        const [name, args] = getMethodEntry(entry);
        it(`${name}() throws PicoServiceError with code SERVICE_UNAVAILABLE`, async () => {
          const fn = api[name] as (...a: unknown[]) => Promise<unknown>;
          expect(typeof fn).toBe('function');
          await expect(fn(...args)).rejects.toMatchObject({
            code: PicoErrorCode.SERVICE_UNAVAILABLE,
          });
        });

        it(`${name}() rejects with PicoServiceError instance`, async () => {
          const fn = api[name] as (...a: unknown[]) => Promise<unknown>;
          await expect(fn(...args)).rejects.toBeInstanceOf(Error);
          try { await fn(...args); } catch (e) {
            expect(isPicoServiceError(e)).toBe(true);
          }
        });
      }
    });

    // ── Seam methods throw PicoServiceError(NOT_IMPLEMENTED) ─────────────────
    describe('seam methods — NOT_IMPLEMENTED regardless of availability', () => {
      for (const entry of seamMethods) {
        const [name, args] = getMethodEntry(entry);
        it(`${name}() throws PicoServiceError with code NOT_IMPLEMENTED`, async () => {
          const fn = api[name] as (...a: unknown[]) => Promise<unknown>;
          expect(typeof fn).toBe('function');
          await expect(fn(...args)).rejects.toMatchObject({
            code: PicoErrorCode.NOT_IMPLEMENTED,
          });
        });
      }
    });

    // ── Event listeners return valid Subscription when unavailable ────────────
    describe('event listeners — null-safe subscription', () => {
      for (const name of listenerMethods) {
        it(`${name}() returns an object with remove()`, () => {
          const fn = api[name] as (cb: () => void) => unknown;
          expect(typeof fn).toBe('function');
          const sub = fn(() => {});
          expect(sub).toBeDefined();
          expect(typeof (sub as { remove: unknown }).remove).toBe('function');
        });

        it(`${name}() remove() does not throw`, () => {
          const fn = api[name] as (cb: () => void) => { remove: () => void };
          const sub = fn(() => {});
          expect(() => sub.remove()).not.toThrow();
        });
      }
    });

    // ── Export safety ─────────────────────────────────────────────────────────
    describe('export safety', () => {
      it('does not re-export raw Error constructor', () => {
        expect(api['Error']).toBeUndefined();
      });

      it('exports availability and version methods', () => {
        expect(api[availabilityMethod]).toBeDefined();
        expect(api[versionMethod]).toBeDefined();
      });
    });
  });
}
