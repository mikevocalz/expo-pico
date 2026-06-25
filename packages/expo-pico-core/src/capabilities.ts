import ExpoPicoModule from './ExpoPicoModule';
import type {
  PicoBodyJoint,
  PicoCapabilityName,
  PicoCapabilitySnapshotEntry,
  PicoController,
  PicoDeclaredCapabilities,
  PicoDetectedPlane,
  PicoEyePose,
  PicoFoveationLevel,
  PicoHandPose,
  PicoHighRateSensor,
  PicoMotionTracker,
} from './types';

/**
 * Unified capability runtime surface.
 *
 * This module is the public TypeScript contract for every capability the
 * prebuild plugin declares. Everything is optional at the device/SDK
 * layer: methods either return the real value (PICO device + SDK present)
 * or null / false (mobile emulator, non-PICO target, or SDK-less PICO
 * build).
 *
 * Consumer pattern:
 *
 *   if (await capabilities.isAvailable('eyeTracking')) {
 *     await capabilities.eye.enable();
 *     const pose = await capabilities.eye.getPose();
 *   }
 *
 * Grouped by domain for discoverability:
 *   - capabilities.declared       — plain mirror of the prebuild flags
 *   - capabilities.snapshot()     — full 3-layer snapshot of all caps
 *   - capabilities.isAvailable()  — single-shot query for one cap
 *   - capabilities.display        — refresh rate, foveation, passthrough
 *   - capabilities.eye            — eye tracking
 *   - capabilities.face           — face tracking
 *   - capabilities.body           — body tracking (Motion Tracker)
 *   - capabilities.hand           — hand tracking
 *   - capabilities.boundary       — Guardian / play-area boundary
 *   - capabilities.scene          — planes + scene mesh
 *   - capabilities.controllers    — controller state + haptics
 *   - capabilities.motionTracker  — Motion Tracker dongles
 *   - capabilities.sensors        — high-rate IMU sensors
 *   - capabilities.spatialAudio   — head-tracked HRTF engine
 */

// ─── Build-time declared capability mirror ────────────────────────────

/**
 * Plain mirror of what the prebuild plugin declared. Reads a BuildConfig
 * constant — cheap and synchronous. Useful for gating UI without waiting
 * for a native async call.
 */
export function getDeclaredCapabilities(): PicoDeclaredCapabilities {
  return (
    ExpoPicoModule.declaredCapabilities ?? {
      handTracking: false,
      passthrough: false,
      sceneUnderstanding: false,
      eyeTracking: false,
      faceTracking: false,
      bodyTracking: false,
      spatialAudio: false,
      foveatedRendering: false,
      highSamplingRateSensors: false,
      boundary: false,
      sceneMesh: false,
      picoSenseController: false,
      motionTracker: false,
      controllerHaptics: false,
      openXrLoader: false,
      ndkAbiFilters: false,
      developerTools: false,
      entitlementCheck: false,
    }
  );
}

/** Refresh rates (Hz) declared at prebuild time. Empty when none. */
export function getDeclaredRefreshRates(): number[] {
  return ExpoPicoModule.declaredRefreshRates ?? [];
}

/** PICO device codenames declared in `targetDevices`. Empty when unconstrained. */
export function getDeclaredTargetDevices(): string[] {
  return ExpoPicoModule.declaredTargetDevices ?? [];
}

// ─── Snapshot ────────────────────────────────────────────────────────

/**
 * Full three-layer capability snapshot (declared × systemFeature × sdk).
 * Preferred entry point for a diagnostics panel.
 */
export async function getCapabilitySnapshot(): Promise<PicoCapabilitySnapshotEntry[]> {
  return (await ExpoPicoModule.getCapabilitySnapshot()) ?? [];
}

/**
 * Single-capability availability check. Returns `true` when declared,
 * device supports it, and the SDK class resolves; `false` when any
 * layer is missing; `null` when the capability name is unknown.
 */
export async function isCapabilityAvailable(
  name: PicoCapabilityName
): Promise<boolean | null> {
  return ExpoPicoModule.isCapabilityAvailable(name);
}

// ─── Display (refresh rate, foveation, passthrough) ─────────────────

export const display = {
  /** Current display refresh rate in Hz. Null when SDK unavailable. */
  async getCurrentRefreshRate(): Promise<number | null> {
    return ExpoPicoModule.getCurrentRefreshRate();
  },
  /** List of supported refresh rates. Null when SDK unavailable. */
  async getSupportedRefreshRates(): Promise<number[] | null> {
    return ExpoPicoModule.getSupportedRefreshRates();
  },
  /**
   * Request a refresh rate. Returns true when the call was dispatched;
   * the OS may clamp to the closest supported value. Re-query
   * `getCurrentRefreshRate()` to confirm.
   */
  async setRefreshRate(hz: number): Promise<boolean> {
    return ExpoPicoModule.setRefreshRate(hz);
  },
  /** Current foveation level. Null when SDK unavailable. */
  async getFoveationLevel(): Promise<PicoFoveationLevel | null> {
    return ExpoPicoModule.getFoveationLevel();
  },
  /** Set foveation level. Returns true when the call was dispatched. */
  async setFoveationLevel(level: PicoFoveationLevel): Promise<boolean> {
    return ExpoPicoModule.setFoveationLevel(level);
  },
  /** Enable or disable passthrough. True when the call was dispatched. */
  async setPassthroughEnabled(enabled: boolean): Promise<boolean> {
    return ExpoPicoModule.setPassthroughEnabled(enabled);
  },
  /** Current passthrough state. Null when SDK unavailable. */
  async isPassthroughActive(): Promise<boolean | null> {
    return ExpoPicoModule.isPassthroughActive();
  },
};

// ─── Tracking: eye, face, body, hand ────────────────────────────────

export const eye = {
  async enable(): Promise<boolean> {
    return ExpoPicoModule.enableEyeTracking();
  },
  async disable(): Promise<boolean> {
    return ExpoPicoModule.disableEyeTracking();
  },
  /** Current gaze pose. Null when disabled or SDK unavailable. */
  async getPose(): Promise<PicoEyePose | null> {
    return ExpoPicoModule.getEyePose();
  },
};

export const face = {
  async enable(): Promise<boolean> {
    return ExpoPicoModule.enableFaceTracking();
  },
  async disable(): Promise<boolean> {
    return ExpoPicoModule.disableFaceTracking();
  },
  /** Face blendshape weights 0..1, keyed by PICO's blendshape name. */
  async getWeights(): Promise<Record<string, number> | null> {
    return ExpoPicoModule.getFaceWeights();
  },
};

export const body = {
  async enable(): Promise<boolean> {
    return ExpoPicoModule.enableBodyTracking();
  },
  async disable(): Promise<boolean> {
    return ExpoPicoModule.disableBodyTracking();
  },
  /** Per-joint pose list. Null when disabled or SDK unavailable. */
  async getJoints(): Promise<PicoBodyJoint[] | null> {
    return ExpoPicoModule.getBodyJoints();
  },
};

export const hand = {
  async enable(): Promise<boolean> {
    return ExpoPicoModule.enableHandTracking();
  },
  async disable(): Promise<boolean> {
    return ExpoPicoModule.disableHandTracking();
  },
  /** Per-hand joint pose snapshot. Null when disabled or SDK unavailable. */
  async getPose(): Promise<PicoHandPose | null> {
    return ExpoPicoModule.getHandPose();
  },
};

// ─── Boundary / Guardian ────────────────────────────────────────────

export const boundary = {
  /** Is the boundary outline currently visible? Null when SDK unavailable. */
  async isVisible(): Promise<boolean | null> {
    return ExpoPicoModule.isBoundaryVisible();
  },
  /** Show or hide the boundary outline overlay. */
  async setVisible(visible: boolean): Promise<boolean> {
    return ExpoPicoModule.setBoundaryVisible(visible);
  },
  /**
   * Polygon vertices defining the boundary in tracking space. Each entry
   * is `[x, y, z]`. Empty list when "stationary" boundary (no polygon).
   * Null when SDK unavailable.
   */
  async getGeometry(): Promise<number[][] | null> {
    return ExpoPicoModule.getBoundaryGeometry();
  },
};

// ─── Scene (planes + mesh) ──────────────────────────────────────────

export const scene = {
  /** Detected plane list. Null when scene understanding unavailable. */
  async getPlanes(): Promise<PicoDetectedPlane[] | null> {
    return ExpoPicoModule.getDetectedPlanes();
  },
  /** Request a new plane scan. Dispatch only — results arrive on next `getPlanes()`. */
  async refreshPlanes(): Promise<boolean> {
    return ExpoPicoModule.refreshScene();
  },
  /** Trigger a scene-mesh rescan. */
  async refreshMesh(): Promise<boolean> {
    return ExpoPicoModule.refreshSceneMesh();
  },
  /** Triangle count reported by the last mesh scan. Null when unavailable. */
  async getMeshTriangleCount(): Promise<number | null> {
    return ExpoPicoModule.getSceneMeshTriangleCount();
  },
};

// ─── Controllers + haptics + motion tracker ─────────────────────────

export const controllers = {
  /** Connected controllers (battery, hand, model). */
  async list(): Promise<PicoController[] | null> {
    return ExpoPicoModule.getControllers();
  },
  /**
   * Fire a haptic pulse on one controller. `amplitude` 0..1, `durationMs`
   * >= 0. Silently no-ops when controllerHaptics is unavailable.
   */
  async triggerHaptic(
    hand: 'left' | 'right',
    amplitude: number,
    durationMs: number
  ): Promise<boolean> {
    return ExpoPicoModule.triggerHaptic(hand, amplitude, durationMs);
  },
};

export const motionTracker = {
  /** Attached Motion Tracker dongles with pose + battery. */
  async list(): Promise<PicoMotionTracker[] | null> {
    return ExpoPicoModule.getMotionTrackers();
  },
};

// ─── Sensors ────────────────────────────────────────────────────────

export const sensors = {
  /**
   * IMU sensor rate report. Reflects actual device capability; won't
   * exceed 200Hz on devices where HIGH_SAMPLING_RATE_SENSORS is not
   * honored even with the permission granted.
   */
  async getHighRate(): Promise<PicoHighRateSensor[]> {
    return (await ExpoPicoModule.getHighRateSensors()) ?? [];
  },
};

// ─── Spatial audio ──────────────────────────────────────────────────

export const spatialAudio = {
  async isEnabled(): Promise<boolean | null> {
    return ExpoPicoModule.isSpatialAudioEnabled();
  },
  async setEnabled(enabled: boolean): Promise<boolean> {
    return ExpoPicoModule.setSpatialAudioEnabled(enabled);
  },
  /** PICO HRTF profile name ("default", "personal", etc.). */
  async getHrtfProfile(): Promise<string | null> {
    return ExpoPicoModule.getHrtfProfile();
  },
};

// ─── Umbrella export for consumer discoverability ───────────────────

export const capabilities = {
  getDeclared: getDeclaredCapabilities,
  getDeclaredRefreshRates,
  getDeclaredTargetDevices,
  getSnapshot: getCapabilitySnapshot,
  isAvailable: isCapabilityAvailable,
  display,
  eye,
  face,
  body,
  hand,
  boundary,
  scene,
  controllers,
  motionTracker,
  sensors,
  spatialAudio,
};
