/**
 * Phase K — capability runtime TS layer.
 *
 * Verifies the `capabilities.*` umbrella + per-domain helpers forward
 * correctly to the native module and degrade to the documented null /
 * false / empty shapes when the native reports absence.
 *
 * Native Kotlin bindings (reflection gated to PICO SDK classes) can only
 * be exercised on a real device — these tests cover the JS layer only.
 */

const mockModule = {
  declaredCapabilities: {
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
  declaredRefreshRates: [72, 90],
  declaredTargetDevices: ['pico-4-ultra', 'swan'],

  getCapabilitySnapshot: jest.fn(async () => [
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
  isCapabilityAvailable: jest.fn(async () => false),

  getCurrentRefreshRate: jest.fn(async () => 72),
  getSupportedRefreshRates: jest.fn(async () => [72, 90, 120]),
  setRefreshRate: jest.fn(async () => true),
  getFoveationLevel: jest.fn(async () => 'medium'),
  setFoveationLevel: jest.fn(async () => true),
  setPassthroughEnabled: jest.fn(async () => true),
  isPassthroughActive: jest.fn(async () => false),

  enableEyeTracking: jest.fn(async () => false),
  disableEyeTracking: jest.fn(async () => false),
  getEyePose: jest.fn(async () => null),
  enableFaceTracking: jest.fn(async () => false),
  disableFaceTracking: jest.fn(async () => false),
  getFaceWeights: jest.fn(async () => null),
  enableBodyTracking: jest.fn(async () => false),
  disableBodyTracking: jest.fn(async () => false),
  getBodyJoints: jest.fn(async () => null),
  enableHandTracking: jest.fn(async () => true),
  disableHandTracking: jest.fn(async () => true),
  getHandPose: jest.fn(async () => null),

  isBoundaryVisible: jest.fn(async () => null),
  setBoundaryVisible: jest.fn(async () => false),
  getBoundaryGeometry: jest.fn(async () => null),
  refreshSceneMesh: jest.fn(async () => false),
  getSceneMeshTriangleCount: jest.fn(async () => null),
  getDetectedPlanes: jest.fn(async () => null),
  refreshScene: jest.fn(async () => false),

  getControllers: jest.fn(async () => [
    { hand: 'left', connected: true, batteryPct: 85, model: 'PICO 4 Ultra' },
    { hand: 'right', connected: true, batteryPct: 90, model: 'PICO 4 Ultra' },
  ]),
  triggerHaptic: jest.fn(async () => true),
  getMotionTrackers: jest.fn(async () => []),

  getHighRateSensors: jest.fn(async () => [
    {
      type: 'gyroscope',
      vendor: 'STMicro',
      name: 'LSM6DSO',
      maxHz: 500,
      minDelayMicros: 2000,
    },
  ]),

  isSpatialAudioEnabled: jest.fn(async () => null),
  setSpatialAudioEnabled: jest.fn(async () => false),
  getHrtfProfile: jest.fn(async () => null),
};

jest.mock('expo', () => ({
  requireNativeModule: jest.fn(() => mockModule),
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
    const saved = mockModule.declaredCapabilities;
    mockModule.declaredCapabilities = undefined as never;
    const caps = getDeclaredCapabilities();
    // Every key must still be present + false so consumers can destructure.
    expect(caps.handTracking).toBe(false);
    expect(caps.eyeTracking).toBe(false);
    expect(caps.openXrLoader).toBe(false);
    mockModule.declaredCapabilities = saved;
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
    mockModule.getCapabilitySnapshot.mockResolvedValueOnce(
      null as unknown as ReturnType<typeof mockModule.getCapabilitySnapshot> extends Promise<infer T> ? T : never
    );
    const snap = await getCapabilitySnapshot();
    expect(snap).toEqual([]);
  });
});

describe('isCapabilityAvailable', () => {
  it('forwards the native boolean result', async () => {
    mockModule.isCapabilityAvailable.mockResolvedValueOnce(
      true as unknown as false
    );
    expect(await isCapabilityAvailable('handTracking')).toBe(true);
  });

  it('returns null when native returns null (unknown capability name)', async () => {
    mockModule.isCapabilityAvailable.mockResolvedValueOnce(
      null as unknown as false
    );
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
    expect(mockModule.setRefreshRate).toHaveBeenCalledWith(90);
  });

  it('returns foveation level', async () => {
    expect(await capabilities.display.getFoveationLevel()).toBe('medium');
  });

  it('forwards foveation setter', async () => {
    expect(await capabilities.display.setFoveationLevel('high')).toBe(true);
    expect(mockModule.setFoveationLevel).toHaveBeenCalledWith('high');
  });

  it('forwards passthrough toggle', async () => {
    expect(await capabilities.display.setPassthroughEnabled(true)).toBe(true);
    expect(mockModule.setPassthroughEnabled).toHaveBeenCalledWith(true);
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
    expect(mockModule.enableEyeTracking).toHaveBeenCalled();
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
    expect(mockModule.triggerHaptic).toHaveBeenCalledWith('right', 0.8, 40);
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
    mockModule.getHighRateSensors.mockResolvedValueOnce(
      null as unknown as Awaited<ReturnType<typeof mockModule.getHighRateSensors>>
    );
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
