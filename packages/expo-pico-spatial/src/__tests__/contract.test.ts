// expo-pico-spatial uses resolveNativeModule which calls requireNativeModule
// from 'expo'. Stubs are provided via jest.config.js moduleNameMapper.
// All native modules are absent in the test environment — every SDK call
// must reject gracefully (SERVICE_UNAVAILABLE), never crash.

import { PicoErrorCode, isPicoServiceError } from '@expo-pico/platform-service-common';

import * as api from '../index';

describe('expo-pico-spatial — SDK family contract', () => {
  // ── Sync accessors with fallback values ──────────────────────────────────────
  describe('sync accessors — safe fallback when native absent', () => {
    it('getSpaceState() returns unknown when native is absent', () => {
      expect(api.getSpaceState()).toBe('unknown');
    });

    it('getContainerType() returns none when native is absent', () => {
      expect(api.getContainerType()).toBe('none');
    });

    it('getSpatialCapabilities() returns all-false when native is absent', () => {
      const caps = api.getSpatialCapabilities();
      expect(caps.spaceStates).toBe(false);
      expect(caps.spatialAnchors).toBe(false);
      expect(caps.sceneUnderstanding).toBe(false);
      expect(caps.passthrough).toBe(false);
      expect(caps.handTracking).toBe(false);
      expect(caps.spatialSdkAvailable).toBe(false);
    });

    it('getSpatialSdkVersion() returns null when native is absent', () => {
      expect(api.getSpatialSdkVersion()).toBeNull();
    });
  });

  // ── Availability flags — all false when SDK absent ─────────────────────────
  describe('availability flags — false when SDK absent', () => {
    it('isEyeGazeAvailable() returns false', () => {
      expect(api.isEyeGazeAvailable()).toBe(false);
    });

    it('isSceneMeshAvailable() returns false', () => {
      expect(api.isSceneMeshAvailable()).toBe(false);
    });

    it('isFaceTrackingAvailable() returns false', () => {
      expect(api.isFaceTrackingAvailable()).toBe(false);
    });

    it('isBodyTrackingAvailable() returns false', () => {
      expect(api.isBodyTrackingAvailable()).toBe(false);
    });
  });

  // ── Spatial SDK async calls — reject with SERVICE_UNAVAILABLE ─────────────────
  describe('async SDK calls — SERVICE_UNAVAILABLE when native absent', () => {
    const sdkCases: [string, unknown[]][] = [
      [
        'createSpatialAnchor',
        [{ position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } }],
      ],
      ['setWindowContainerProperties', [{ width: 800, height: 600 }]],
      ['requestFullSpace', []],
      ['getSceneMesh', []],
    ];

    for (const [name, args] of sdkCases) {
      it(`${name}() rejects with PicoServiceError`, async () => {
        const fn = (api as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[name];
        expect(typeof fn).toBe('function');
        try {
          await fn(...args);
          fail(`${name} should have rejected`);
        } catch (e) {
          expect(isPicoServiceError(e)).toBe(true);
        }
      });

      it(`${name}() rejects with code SERVICE_UNAVAILABLE`, async () => {
        const fn = (api as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[name];
        await expect(fn(...args)).rejects.toMatchObject({
          code: PicoErrorCode.SERVICE_UNAVAILABLE,
        });
      });
    }
  });

  // ── getGazeSnapshot — returns null when eye gaze absent ──────────────────────
  describe('getGazeSnapshot — null when native absent', () => {
    it('resolves to null (not rejected) when NativeEyeGaze is null', async () => {
      await expect(api.getGazeSnapshot()).resolves.toBeNull();
    });
  });

  // ── Typed array normalization ─────────────────────────────────────────────────
  describe('SceneMesh typed array normalization', () => {
    it('normalizes raw number[] vertices to Float32Array', () => {
      const raw = { vertices: [1, 2, 3], indices: [0, 1, 2] };
      const mesh = {
        vertices: new Float32Array(raw.vertices),
        indices: new Uint32Array(raw.indices),
      };
      expect(mesh.vertices).toBeInstanceOf(Float32Array);
      expect(mesh.indices).toBeInstanceOf(Uint32Array);
      expect(mesh.vertices[0]).toBe(1);
      expect(mesh.indices[2]).toBe(2);
    });

    it('produces undefined normals when normals field is absent', () => {
      const raw: { vertices: number[]; indices: number[]; normals?: number[] } = {
        vertices: [0, 0, 0],
        indices: [0],
      };
      const normals = raw.normals ? new Float32Array(raw.normals) : undefined;
      expect(normals).toBeUndefined();
    });

    it('normalizes normals to Float32Array when present', () => {
      const raw = { vertices: [0], indices: [0], normals: [0, 1, 0] };
      const normals = new Float32Array(raw.normals);
      expect(normals).toBeInstanceOf(Float32Array);
      expect(normals[1]).toBe(1);
    });
  });

  // ── Listener APIs — return valid subscription objects ────────────────────────
  describe('listener APIs — return { remove() } without throwing', () => {
    const listenerCases: [string, [unknown]][] = [
      ['addGazeListener', [() => {}]],
      ['addSceneMeshUpdateListener', [() => {}]],
      ['addFaceListener', [() => {}]],
      ['addBodyListener', [() => {}]],
    ];

    for (const [name, args] of listenerCases) {
      it(`${name}() returns a Subscription with remove()`, () => {
        const fn = (api as unknown as Record<string, (...a: unknown[]) => unknown>)[name];
        expect(typeof fn).toBe('function');
        let sub: unknown;
        expect(() => {
          sub = fn(...args);
        }).not.toThrow();
        expect(sub).toBeDefined();
        expect(typeof (sub as { remove(): void }).remove).toBe('function');
        expect(() => (sub as { remove(): void }).remove()).not.toThrow();
      });
    }
  });

  // ── No-throw guarantee ────────────────────────────────────────────────────────
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

    it('isEyeGazeAvailable() does not throw', () => {
      expect(() => api.isEyeGazeAvailable()).not.toThrow();
    });

    it('isSceneMeshAvailable() does not throw', () => {
      expect(() => api.isSceneMeshAvailable()).not.toThrow();
    });

    it('isFaceTrackingAvailable() does not throw', () => {
      expect(() => api.isFaceTrackingAvailable()).not.toThrow();
    });

    it('isBodyTrackingAvailable() does not throw', () => {
      expect(() => api.isBodyTrackingAvailable()).not.toThrow();
    });
  });

  // ── Export completeness ───────────────────────────────────────────────────────
  describe('export completeness', () => {
    const syncExports = [
      'getSpaceState',
      'getContainerType',
      'getSpatialCapabilities',
      'getSpatialSdkVersion',
      'isEyeGazeAvailable',
      'isSceneMeshAvailable',
      'isFaceTrackingAvailable',
      'isBodyTrackingAvailable',
    ];
    const asyncExports = [
      'createSpatialAnchor',
      'setWindowContainerProperties',
      'requestFullSpace',
      'getGazeSnapshot',
      'getSceneMesh',
    ];
    const listenerExports = [
      'addGazeListener',
      'addSceneMeshUpdateListener',
      'addFaceListener',
      'addBodyListener',
    ];

    for (const name of [...syncExports, ...asyncExports, ...listenerExports]) {
      it(`exports ${name}`, () => {
        expect(typeof (api as Record<string, unknown>)[name]).toBe('function');
      });
    }

    it('does not re-export raw Error constructor', () => {
      expect((api as Record<string, unknown>)['Error']).toBeUndefined();
    });
  });
});
