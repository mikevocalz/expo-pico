/**
 * Capability runtime TS layer.
 *
 * Verifies the `capabilities.*` umbrella + per-domain helpers forward
 * correctly to the native module and degrade to the documented null /
 * false / empty shapes when the native reports absence.
 *
 * Native Kotlin bindings (reflection gated to PICO SDK classes) can only
 * be exercised on a real device — these tests cover the JS layer only.
 */

const mockDeclared: { capabilities: Record<string, boolean> | undefined } = {
  capabilities: {
    handTracking: true,
    passthrough: true,
    sceneUnderstanding: false,
    eyeTracking: false,
    faceTracking: false,
    bodyTracking: false,
    spatialAudio: false,
    foveatedRendering: false,
    highSamplingRateSensors: true,
    boundary: false,
    sceneMesh: false,
    picoSenseController: false,
    motionTracker: false,
    controllerHaptics: false,
    openXrLoader: true,
    ndkAbiFilters: true,
    developerTools: false,
    entitlementCheck: false,
  },
};

// PicoCoreV2 Expo module. Native functions are synchronous; the adapter in
// ExpoPicoModule.ts wraps them in promises.
const mockCore = {
  getInfo: jest.fn(() => ({})),
  getDeclaredCapabilities: jest.fn(() => mockDeclared.capabilities),
  getDeclaredRefreshRates: jest.fn(() => [72, 90]),
  getDeclaredTargetDevices: jest.fn(() => ['pico-4-ultra', 'swan']),

  getCapabilitySnapshot: jest.fn((): unknown => [
    {
      name: 'eyeTracking',
      declared: true,
      systemFeature: 'pico.hardware.eyetracking',
      systemFeatureAvailable: false,
      sdkClassFound: null,
      sdkAvailable: false,
      fullyAvailable: false,
    },
  ]),
  isCapabilityAvailable: jest.fn((): unknown => false),
};

// PicoRuntimeV2 Expo module.
const mockRuntime = {
  getAvailability: jest.fn(() => ({ hapticsAvailable: true, passthroughAvailable: true })),
  getCurrentRefreshRate: jest.fn((): unknown => 72),
  getSupportedRefreshRates: jest.fn((): unknown => [72, 90, 120]),
  setRefreshRate: jest.fn((): unknown => true),
  getFoveationLevel: jest.fn((): unknown => 'medium'),
  setFoveationLevel: jest.fn((): unknown => true),
  setPassthroughEnabled: jest.fn((): unknown => true),
  isPassthroughActive: jest.fn((): unknown => false),

  enableEyeTracking: jest.fn((): unknown => false),
  disableEyeTracking: jest.fn((): unknown => false),
  getEyePose: jest.fn((): unknown => null),
  enableFaceTracking: jest.fn((): unknown => false),
  disableFaceTracking: jest.fn((): unknown => false),
  getFaceWeights: jest.fn((): unknown => null),
  enableBodyTracking: jest.fn((): unknown => false),
  disableBodyTracking: jest.fn((): unknown => false),
  getBodyJoints: jest.fn((): unknown => null),
  enableHandTracking: jest.fn((): unknown => true),
  disableHandTracking: jest.fn((): unknown => true),
  getHandPose: jest.fn((): unknown => null),

  isBoundaryVisible: jest.fn((): unknown => null),
  setBoundaryVisible: jest.fn((): unknown => false),
  getBoundaryGeometry: jest.fn((): unknown => null),
  refreshSceneMesh: jest.fn((): unknown => false),
  getSceneMeshTriangleCount: jest.fn((): unknown => null),
  getDetectedPlanes: jest.fn((): unknown => null),
  refreshScene: jest.fn((): unknown => false),

  getControllers: jest.fn((): unknown => [
    { hand: 'left', connected: true, batteryPct: 85, model: 'PICO 4 Ultra' },
    { hand: 'right', connected: true, batteryPct: 90, model: 'PICO 4 Ultra' },
  ]),
  triggerHaptic: jest.fn((): unknown => true),
  getMotionTrackers: jest.fn((): unknown => []),

  getHighRateSensors: jest.fn((): unknown => [
    {
      type: 'gyroscope',
      vendor: 'STMicro',
      name: 'LSM6DSO',
      maxHz: 500,
      minDelayMicros: 2000,
    },
  ]),

  isSpatialAudioEnabled: jest.fn((): unknown => null),
  setSpatialAudioEnabled: jest.fn((): unknown => false),
  getHrtfProfile: jest.fn((): unknown => null),
};

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn((name: string) => {
    if (name === 'PicoCoreV2') return mockCore;
    if (name === 'PicoRuntimeV2') return mockRuntime;
    return null;
  }),
}));

import {
  capabilities,
  getCapabilitySnapshot,
  getDeclaredCapabilities,
  getDeclaredRefreshRates,
  getDeclaredTargetDevices,
  isCapabilityAvailable,
} from '../index';

describe('declared capabilities mirror', () => {
  it('returns the prebuild-declared flags', () => {
    const caps = getDeclaredCapabilities();
    expect(caps.handTracking).toBe(true);
    expect(caps.passthrough).toBe(true);
    expect(caps.eyeTracking).toBe(false);
    expect(caps.highSamplingRateSensors).toBe(true);
    expect(caps.ndkAbiFilters).toBe(true);
  });

  it('returns declared refresh rates in order', () => {
    expect(getDeclaredRefreshRates()).toEqual([72, 90]);
  });

  it('returns declared target devices in order', () => {
    expect(getDeclaredTargetDevices()).toEqual(['pico-4-ultra', 'swan']);
  });

  it('gracefully handles a missing declaredCapabilities field', () => {
    const saved = mockDeclared.capabilities;
    mockDeclared.capabilities = undefined;
    const caps = getDeclaredCapabilities();
    // Every key must still be present + false so consumers can destructure.
    expect(caps.handTracking).toBe(false);
    expect(caps.eyeTracking).toBe(false);
    expect(caps.openXrLoader).toBe(false);
    mockDeclared.capabilities = saved;
  });
});

describe('getCapabilitySnapshot', () => {
  it('forwards the native snapshot', async () => {
    const snap = await getCapabilitySnapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].name).toBe('eyeTracking');
    expect(snap[0].fullyAvailable).toBe(false);
  });

  it('returns empty when native returns null', async () => {
    mockCore.getCapabilitySnapshot.mockReturnValueOnce(null);
    const snap = await getCapabilitySnapshot();
    expect(snap).toEqual([]);
  });
});

describe('isCapabilityAvailable', () => {
  it('forwards the native boolean result', async () => {
    mockCore.isCapabilityAvailable.mockReturnValueOnce(true);
    expect(await isCapabilityAvailable('handTracking')).toBe(true);
  });

  it('returns null when native returns null (unknown capability name)', async () => {
    mockCore.isCapabilityAvailable.mockReturnValueOnce(null);
    expect(await isCapabilityAvailable('eyeTracking')).toBeNull();
  });
});

describe('capabilities.display', () => {
  it('returns current refresh rate', async () => {
    expect(await capabilities.display.getCurrentRefreshRate()).toBe(72);
  });

  it('returns supported refresh rates', async () => {
    expect(await capabilities.display.getSupportedRefreshRates()).toEqual([72, 90, 120]);
  });

  it('forwards refresh rate setter', async () => {
    expect(await capabilities.display.setRefreshRate(90)).toBe(true);
    expect(mockRuntime.setRefreshRate).toHaveBeenCalledWith(90);
  });

  it('returns foveation level', async () => {
    expect(await capabilities.display.getFoveationLevel()).toBe('medium');
  });

  it('forwards foveation setter', async () => {
    expect(await capabilities.display.setFoveationLevel('high')).toBe(true);
    expect(mockRuntime.setFoveationLevel).toHaveBeenCalledWith('high');
  });

  it('forwards passthrough toggle', async () => {
    expect(await capabilities.display.setPassthroughEnabled(true)).toBe(true);
    expect(mockRuntime.setPassthroughEnabled).toHaveBeenCalledWith(true);
  });

  it('returns passthrough state', async () => {
    expect(await capabilities.display.isPassthroughActive()).toBe(false);
  });
});

describe('capabilities.eye / face / body / hand', () => {
  it('hand.getPose returns null when SDK absent', async () => {
    expect(await capabilities.hand.getPose()).toBeNull();
  });

  it('eye.enable forwards to native', async () => {
    await capabilities.eye.enable();
    expect(mockRuntime.enableEyeTracking).toHaveBeenCalled();
  });

  it('face.getWeights returns null when SDK absent', async () => {
    expect(await capabilities.face.getWeights()).toBeNull();
  });

  it('body.getJoints returns null when SDK absent', async () => {
    expect(await capabilities.body.getJoints()).toBeNull();
  });

  it('hand.enable returns true (declared + SDK fallback)', async () => {
    expect(await capabilities.hand.enable()).toBe(true);
  });
});

describe('capabilities.boundary / scene', () => {
  it('boundary.isVisible returns null when SDK absent', async () => {
    expect(await capabilities.boundary.isVisible()).toBeNull();
  });

  it('boundary.getGeometry returns null when SDK absent', async () => {
    expect(await capabilities.boundary.getGeometry()).toBeNull();
  });

  it('scene.getPlanes returns null when SDK absent', async () => {
    expect(await capabilities.scene.getPlanes()).toBeNull();
  });

  it('scene.refreshMesh returns false when SDK absent', async () => {
    expect(await capabilities.scene.refreshMesh()).toBe(false);
  });
});

describe('capabilities.controllers / motionTracker', () => {
  it('lists connected controllers', async () => {
    const list = await capabilities.controllers.list();
    expect(list).toHaveLength(2);
    expect(list![0].hand).toBe('left');
  });

  it('triggerHaptic forwards amplitude and duration', async () => {
    await capabilities.controllers.triggerHaptic('right', 0.8, 40);
    expect(mockRuntime.triggerHaptic).toHaveBeenCalledWith('right', 0.8, 40);
  });

  it('motionTracker.list returns empty when no dongles connected', async () => {
    expect(await capabilities.motionTracker.list()).toEqual([]);
  });
});

describe('capabilities.sensors', () => {
  it('returns the high-rate sensor list', async () => {
    const list = await capabilities.sensors.getHighRate();
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe('gyroscope');
    expect(list[0].maxHz).toBe(500);
  });

  it('returns empty when native returns null', async () => {
    mockRuntime.getHighRateSensors.mockReturnValueOnce(null);
    expect(await capabilities.sensors.getHighRate()).toEqual([]);
  });
});

describe('capabilities.spatialAudio', () => {
  it('isEnabled returns null when SDK absent', async () => {
    expect(await capabilities.spatialAudio.isEnabled()).toBeNull();
  });

  it('setEnabled returns false when SDK absent', async () => {
    expect(await capabilities.spatialAudio.setEnabled(true)).toBe(false);
  });

  it('getHrtfProfile returns null when SDK absent', async () => {
    expect(await capabilities.spatialAudio.getHrtfProfile()).toBeNull();
  });
});

describe('capabilities umbrella', () => {
  it('exposes every domain namespace', () => {
    expect(typeof capabilities.getDeclared).toBe('function');
    expect(typeof capabilities.getSnapshot).toBe('function');
    expect(typeof capabilities.isAvailable).toBe('function');
    expect(capabilities.display).toBeDefined();
    expect(capabilities.eye).toBeDefined();
    expect(capabilities.face).toBeDefined();
    expect(capabilities.body).toBeDefined();
    expect(capabilities.hand).toBeDefined();
    expect(capabilities.boundary).toBeDefined();
    expect(capabilities.scene).toBeDefined();
    expect(capabilities.controllers).toBeDefined();
    expect(capabilities.motionTracker).toBeDefined();
    expect(capabilities.sensors).toBeDefined();
    expect(capabilities.spatialAudio).toBeDefined();
  });
});
