// expo-pico-spatial uses a try/catch fallback internally, so requireNativeModule
// throwing here causes the module to use its safe fallback values.
jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn(() => { throw new Error('Module not found'); }),
  EventEmitter: jest.fn(),
}));

import * as api from '../index';
import { PicoErrorCode, isPicoServiceError } from '@expo-pico/platform-service-common';

describe('expo-pico-spatial — SDK family contract', () => {

  // ── Sync accessors with fallback values ──────────────────────────────────────
  describe('sync accessors — safe fallback when native absent', () => {
    it('getSpaceState is exported as a function', () => {
      expect(typeof api.getSpaceState).toBe('function');
    });

    it('getSpaceState() returns unknown when native is absent', () => {
      expect(api.getSpaceState()).toBe('unknown');
    });

    it('getContainerType is exported as a function', () => {
      expect(typeof api.getContainerType).toBe('function');
    });

    it('getContainerType() returns none when native is absent', () => {
      expect(api.getContainerType()).toBe('none');
    });

    it('getSpatialCapabilities is exported as a function', () => {
      expect(typeof api.getSpatialCapabilities).toBe('function');
    });

    it('getSpatialCapabilities() returns all-false capabilities when native is absent', () => {
      const caps = api.getSpatialCapabilities();
      expect(caps.spaceStates).toBe(false);
      expect(caps.spatialAnchors).toBe(false);
      expect(caps.sceneUnderstanding).toBe(false);
      expect(caps.passthrough).toBe(false);
      expect(caps.handTracking).toBe(false);
      expect(caps.spatialSdkAvailable).toBe(false);
    });

    it('getSpatialSdkVersion is exported as a function', () => {
      expect(typeof api.getSpatialSdkVersion).toBe('function');
    });

    it('getSpatialSdkVersion() returns null when native is absent', () => {
      expect(api.getSpatialSdkVersion()).toBeNull();
    });
  });

  // ── Seam methods throw NOT_IMPLEMENTED ───────────────────────────────────────
  describe('seam methods — NOT_IMPLEMENTED regardless of availability', () => {
    const seamCases: Array<[string, unknown[]]> = [
      ['createSpatialAnchor', [{ position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } }]],
      ['setWindowContainerProperties', [{ width: 800, height: 600 }]],
      ['requestFullSpace', []],
    ];

    for (const [name, args] of seamCases) {
      it(`${name}() throws PicoServiceError with code NOT_IMPLEMENTED`, async () => {
        const fn = (api as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[name];
        expect(typeof fn).toBe('function');
        await expect(fn(...args)).rejects.toMatchObject({
          code: PicoErrorCode.NOT_IMPLEMENTED,
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

  // ── No-throw guarantee — sync methods never throw ────────────────────────────
  describe('sync methods — never throw when native absent', () => {
    it('getSpaceState() does not throw', () => {
      expect(() => api.getSpaceState()).not.toThrow();
    });

    it('getContainerType() does not throw', () => {
      expect(() => api.getContainerType()).not.toThrow();
    });

    it('getSpatialCapabilities() does not throw', () => {
      expect(() => api.getSpatialCapabilities()).not.toThrow();
    });

    it('getSpatialSdkVersion() does not throw', () => {
      expect(() => api.getSpatialSdkVersion()).not.toThrow();
    });
  });

  // ── Export safety ────────────────────────────────────────────────────────────
  describe('export safety', () => {
    it('does not re-export raw Error constructor', () => {
      expect((api as Record<string, unknown>)['Error']).toBeUndefined();
    });

    it('exports all documented sync functions', () => {
      expect(api.getSpaceState).toBeDefined();
      expect(api.getContainerType).toBeDefined();
      expect(api.getSpatialCapabilities).toBeDefined();
      expect(api.getSpatialSdkVersion).toBeDefined();
    });

    it('exports all documented seam functions', () => {
      expect(api.createSpatialAnchor).toBeDefined();
      expect(api.setWindowContainerProperties).toBeDefined();
      expect(api.requestFullSpace).toBeDefined();
    });
  });
});
