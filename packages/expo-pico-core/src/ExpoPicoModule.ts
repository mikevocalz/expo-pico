import { requireOptionalNativeModule } from 'expo-modules-core';
import type { PicoCore } from './PicoCoreNativeTypes';
import type { PicoRuntime, PicoVec3, PicoQuat } from './PicoRuntimeNativeTypes';
import type {
  PicoBodyJoint,
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
 * Expo Modules v2 adapter preserving the existing public API.
 *
 * Keeps the exact shape the rest of the package already consumes — sync
 * properties, `| null` rather than optionals, and positional tuples for
 * vectors — so capabilities.ts, diagnostics.ts and types.ts need no changes
 * and the public API is unchanged. Struct/tuple and undefined/null
 * translation happens here and nowhere else.
 */

type PicoCoreV2Native = {
  getInfo(): Record<string, any>;
  getDeclaredCapabilities(): Record<string, boolean>;
  getDeclaredRefreshRates(): number[];
  getDeclaredTargetDevices(): string[];
  getPlatformSdkProbe(): Record<string, boolean>;
  hasSystemFeature(name: string): boolean;
  getDeclaredFeatures(): Array<Record<string, any>>;
  getDeclaredPermissions(): Array<Record<string, any>>;
  getCapabilitySnapshot(): Array<Record<string, any>>;
  isCapabilityAvailable(name: string): boolean | null;
  enterImmersiveScene(): boolean;
  exitImmersiveScene(): boolean;
  hasImmersiveActivity(): boolean;
};

type PicoRuntimeV2Native = {
  getAvailability(): { hapticsAvailable: boolean; passthroughAvailable: boolean };
  getCurrentRefreshRate(): number | null;
  getSupportedRefreshRates(): number[] | null;
  setRefreshRate(hz: number): boolean;
  getFoveationLevel(): string | null;
  setFoveationLevel(level: string): boolean;
  setPassthroughEnabled(enabled: boolean): boolean;
  isPassthroughActive(): boolean | null;
  setPassthroughLevel(enabled: boolean, level: number): void;
  enableEyeTracking(): boolean;
  disableEyeTracking(): boolean;
  getEyePose(): any;
  enableFaceTracking(): boolean;
  disableFaceTracking(): boolean;
  getFaceWeights(): Record<string, number> | null;
  enableBodyTracking(): boolean;
  disableBodyTracking(): boolean;
  getBodyJoints(): any;
  enableHandTracking(): boolean;
  disableHandTracking(): boolean;
  getHandPose(): any;
  isBoundaryVisible(): boolean | null;
  setBoundaryVisible(visible: boolean): boolean;
  getBoundaryGeometry(): any;
  refreshSceneMesh(): boolean;
  getSceneMeshTriangleCount(): number | null;
  getDetectedPlanes(): any;
  refreshScene(): boolean;
  getControllers(): any;
  triggerHaptic(hand: string, amplitude: number, durationMs: number): boolean;
  pulseHaptic(hand: string, amplitude: number, durationMs: number): void;
  getMotionTrackers(): any;
  getHighRateSensors(): any[];
  isSpatialAudioEnabled(): boolean | null;
  setSpatialAudioEnabled(enabled: boolean): boolean;
  getHrtfProfile(): string | null;
};

let coreV2Cache: PicoCoreV2Native | null | undefined;
let runtimeV2Cache: PicoRuntimeV2Native | null | undefined;
let passthroughListenerId = 0;

function coreV2(): PicoCoreV2Native | null {
  if (coreV2Cache !== undefined) return coreV2Cache;
  try {
    coreV2Cache = requireOptionalNativeModule<PicoCoreV2Native>('PicoCoreV2');
  } catch {
    coreV2Cache = null;
  }
  return coreV2Cache;
}

function runtimeV2(): PicoRuntimeV2Native | null {
  if (runtimeV2Cache !== undefined) return runtimeV2Cache;
  try {
    runtimeV2Cache = requireOptionalNativeModule<PicoRuntimeV2Native>('PicoRuntimeV2');
  } catch {
    runtimeV2Cache = null;
  }
  return runtimeV2Cache;
}

function core(): PicoCore | null {
  const v2 = coreV2();
  if (v2) {
    const info = () => v2.getInfo();
    const adapter = {
      get isPicoBuild() {
        return !!info().isPicoBuild;
      },
      get isPicoDevice() {
        return !!info().isPicoDevice;
      },
      get spatialMode() {
        return info().spatialMode ?? 'none';
      },
      get containerMode() {
        return info().containerMode ?? 'none';
      },
      get targetProfile() {
        return info().targetProfile ?? 'unknown';
      },
      get xrMode() {
        return info().xrMode ?? 'mobile';
      },
      get appType() {
        return info().appType ?? '2d';
      },
      get picoAppId() {
        return info().picoAppId ?? undefined;
      },
      get picoAppKey() {
        return info().picoAppKey ?? undefined;
      },
      get hasPlatformIdentity() {
        return !!info().hasPlatformIdentity;
      },
      get hasIapIdentity() {
        return !!info().hasIapIdentity;
      },
      get picoOsVersion() {
        return info().picoOsVersion ?? undefined;
      },
      get deviceModel() {
        return info().deviceModel ?? undefined;
      },
      get emulatorOptimizations() {
        return !!info().emulatorOptimizations;
      },
      get swanRuntimeInitialized() {
        return !!info().swanRuntimeInitialized;
      },
      get os5RuntimeInitialized() {
        return !!info().os5RuntimeInitialized;
      },
      get platformSdkPresent() {
        return !!info().platformSdkPresent;
      },
      get platformSdkVersion() {
        return info().platformSdkVersion ?? undefined;
      },
      get declaredCapabilities() {
        return v2.getDeclaredCapabilities();
      },
      get declaredRefreshRates() {
        return v2.getDeclaredRefreshRates();
      },
      get declaredTargetDevices() {
        return v2.getDeclaredTargetDevices();
      },
      hasSystemFeature: async (name: string) => v2.hasSystemFeature(name),
      getDeclaredFeatures: async () => v2.getDeclaredFeatures(),
      getDeclaredPermissions: async () => v2.getDeclaredPermissions(),
      getPlatformSdkProbe: async () => v2.getPlatformSdkProbe(),
      enterImmersiveScene: async () => v2.enterImmersiveScene(),
      exitImmersiveScene: async () => v2.exitImmersiveScene(),
      hasImmersiveActivity: async () => v2.hasImmersiveActivity(),
      getCapabilitySnapshot: async () => v2.getCapabilitySnapshot(),
      isCapabilityAvailable: async (name: any) => v2.isCapabilityAvailable(name) ?? undefined,
    };
    return adapter as unknown as PicoCore;
  }
  return null;
}

function runtime(): PicoRuntime | null {
  const v2 = runtimeV2();
  if (v2) {
    const adapter = {
      get hapticsAvailable() {
        return !!v2.getAvailability().hapticsAvailable;
      },
      get passthroughAvailable() {
        return !!v2.getAvailability().passthroughAvailable;
      },
      getCurrentRefreshRate: async () => v2.getCurrentRefreshRate() ?? undefined,
      getSupportedRefreshRates: async () => v2.getSupportedRefreshRates() ?? undefined,
      setRefreshRate: async (hz: number) => v2.setRefreshRate(hz),
      getFoveationLevel: async () => v2.getFoveationLevel() as any,
      setFoveationLevel: async (level: any) => v2.setFoveationLevel(level),
      setPassthroughEnabled: async (enabled: boolean) => v2.setPassthroughEnabled(enabled),
      isPassthroughActive: async () => v2.isPassthroughActive() ?? undefined,
      setPassthroughLevel: async (enabled: boolean, level: number) =>
        v2.setPassthroughLevel(enabled, level),
      enableEyeTracking: async () => v2.enableEyeTracking(),
      disableEyeTracking: async () => v2.disableEyeTracking(),
      getEyePose: async () => v2.getEyePose() ?? undefined,
      enableFaceTracking: async () => v2.enableFaceTracking(),
      disableFaceTracking: async () => v2.disableFaceTracking(),
      getFaceWeights: async () => v2.getFaceWeights() ?? undefined,
      enableBodyTracking: async () => v2.enableBodyTracking(),
      disableBodyTracking: async () => v2.disableBodyTracking(),
      getBodyJoints: async () => v2.getBodyJoints() ?? undefined,
      enableHandTracking: async () => v2.enableHandTracking(),
      disableHandTracking: async () => v2.disableHandTracking(),
      getHandPose: async () => v2.getHandPose() ?? undefined,
      isBoundaryVisible: async () => v2.isBoundaryVisible() ?? undefined,
      setBoundaryVisible: async (visible: boolean) => v2.setBoundaryVisible(visible),
      getBoundaryGeometry: async () => v2.getBoundaryGeometry() ?? undefined,
      refreshSceneMesh: async () => v2.refreshSceneMesh(),
      getSceneMeshTriangleCount: async () => v2.getSceneMeshTriangleCount() ?? undefined,
      getDetectedPlanes: async () => v2.getDetectedPlanes() ?? undefined,
      refreshScene: async () => v2.refreshScene(),
      getControllers: async () => v2.getControllers() ?? undefined,
      triggerHaptic: async (hand: any, amplitude: number, durationMs: number) =>
        v2.triggerHaptic(hand, amplitude, durationMs),
      pulseHaptic: async (hand: any, amplitude: number, durationMs: number) =>
        v2.pulseHaptic(hand, amplitude, durationMs),
      getMotionTrackers: async () => v2.getMotionTrackers() ?? undefined,
      getHighRateSensors: async () => v2.getHighRateSensors(),
      isSpatialAudioEnabled: async () => v2.isSpatialAudioEnabled() ?? undefined,
      setSpatialAudioEnabled: async (enabled: boolean) => v2.setSpatialAudioEnabled(enabled),
      getHrtfProfile: async () => v2.getHrtfProfile() ?? undefined,
      addPassthroughDialListener: () => ++passthroughListenerId,
      removeListener: () => {},
    };
    return adapter as unknown as PicoRuntime;
  }
  return null;
}

const nn = <T>(v: T | undefined): T | null => (v === undefined ? null : v);

const vec3 = (v: PicoVec3 | undefined): [number, number, number] | null =>
  v ? [v.x, v.y, v.z] : null;

const quat = (q: PicoQuat): [number, number, number, number] => [q.x, q.y, q.z, q.w];

const UNAVAILABLE = 'PICO native library not present in this build';

function requireRuntime(): PicoRuntime {
  const r = runtime();
  if (!r) throw new Error(UNAVAILABLE);
  return r;
}

const EMPTY_CAPABILITIES: PicoDeclaredCapabilities = {
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
};

const ExpoPicoModule = {
  // ── Build + device identity ───────────────────────────────────────────────
  get isPicoBuild(): boolean {
    return core()?.isPicoBuild ?? false;
  },
  get isPicoDevice(): boolean {
    return core()?.isPicoDevice ?? false;
  },
  get spatialMode(): string {
    return core()?.spatialMode ?? 'none';
  },
  get targetProfile(): string {
    return core()?.targetProfile ?? 'unknown';
  },
  get containerMode(): string {
    return core()?.containerMode ?? 'none';
  },
  get xrMode(): string {
    return core()?.xrMode ?? 'mobile';
  },
  get appType(): string {
    return core()?.appType ?? '2d';
  },
  get picoAppId(): string | null {
    return nn(core()?.picoAppId);
  },
  get picoAppKey(): string | null {
    return nn(core()?.picoAppKey);
  },
  get hasPlatformIdentity(): boolean {
    return core()?.hasPlatformIdentity ?? false;
  },
  get hasIapIdentity(): boolean {
    return core()?.hasIapIdentity ?? false;
  },
  get picoOsVersion(): string | null {
    return nn(core()?.picoOsVersion);
  },
  get deviceModel(): string | null {
    return nn(core()?.deviceModel);
  },
  get emulatorOptimizations(): boolean {
    return core()?.emulatorOptimizations ?? false;
  },
  get swanRuntimeInitialized(): boolean {
    return core()?.swanRuntimeInitialized ?? false;
  },
  get os5RuntimeInitialized(): boolean {
    return core()?.os5RuntimeInitialized ?? false;
  },

  // ── Platform SDK reflection probe ─────────────────────────────────────────
  get platformSdkPresent(): boolean {
    return core()?.platformSdkPresent ?? false;
  },
  get platformSdkVersion(): string | null {
    return nn(core()?.platformSdkVersion);
  },

  // ── Prebuild-declared config ──────────────────────────────────────────────
  get declaredCapabilities(): PicoDeclaredCapabilities {
    return core()?.declaredCapabilities ?? EMPTY_CAPABILITIES;
  },
  get declaredRefreshRates(): number[] {
    return core()?.declaredRefreshRates ?? [];
  },
  get declaredTargetDevices(): string[] {
    return core()?.declaredTargetDevices ?? [];
  },

  // ── Runtime introspection ─────────────────────────────────────────────────
  async hasSystemFeature(name: string): Promise<boolean> {
    return (await core()?.hasSystemFeature(name)) ?? false;
  },
  async getDeclaredFeatures() {
    return (await core()?.getDeclaredFeatures()) ?? [];
  },
  async getDeclaredPermissions() {
    return (await core()?.getDeclaredPermissions()) ?? [];
  },
  async getPlatformSdkProbe(): Promise<Record<string, boolean>> {
    return (await core()?.getPlatformSdkProbe()) ?? {};
  },
  async enterImmersiveScene(): Promise<boolean> {
    return (await core()?.enterImmersiveScene()) ?? false;
  },

  async exitImmersiveScene(): Promise<boolean> {
    return (await core()?.exitImmersiveScene()) ?? false;
  },

  async hasImmersiveActivity(): Promise<boolean> {
    return (await core()?.hasImmersiveActivity()) ?? false;
  },

  async getCapabilitySnapshot(): Promise<PicoCapabilitySnapshotEntry[]> {
    const entries = (await core()?.getCapabilitySnapshot()) ?? [];
    // The spec uses optionals; types.ts uses nulls. Normalise per entry —
    // scalars are handled by nn() but nested structs need mapping.
    return entries.map((e) => ({
      name: e.name,
      declared: e.declared,
      systemFeature: nn(e.systemFeature),
      systemFeatureAvailable: nn(e.systemFeatureAvailable),
      sdkClassFound: nn(e.sdkClassFound),
      sdkAvailable: e.sdkAvailable,
      fullyAvailable: e.fullyAvailable,
    }));
  },
  async isCapabilityAvailable(name: Parameters<PicoCore['isCapabilityAvailable']>[0]) {
    return nn(await core()?.isCapabilityAvailable(name));
  },

  // ── XR display ────────────────────────────────────────────────────────────
  async getCurrentRefreshRate(): Promise<number | null> {
    return nn(await runtime()?.getCurrentRefreshRate());
  },
  async getSupportedRefreshRates(): Promise<number[] | null> {
    return nn(await runtime()?.getSupportedRefreshRates());
  },
  async setRefreshRate(hz: number): Promise<boolean> {
    return requireRuntime().setRefreshRate(hz);
  },
  async getFoveationLevel(): Promise<PicoFoveationLevel | null> {
    return nn(await runtime()?.getFoveationLevel()) as PicoFoveationLevel | null;
  },
  async setFoveationLevel(level: PicoFoveationLevel): Promise<boolean> {
    return requireRuntime().setFoveationLevel(level);
  },
  async setPassthroughEnabled(enabled: boolean): Promise<boolean> {
    return requireRuntime().setPassthroughEnabled(enabled);
  },
  async isPassthroughActive(): Promise<boolean | null> {
    return nn(await runtime()?.isPassthroughActive());
  },

  // ── Tracking ──────────────────────────────────────────────────────────────
  async enableEyeTracking(): Promise<boolean> {
    return requireRuntime().enableEyeTracking();
  },
  async disableEyeTracking(): Promise<boolean> {
    return requireRuntime().disableEyeTracking();
  },
  async getEyePose(): Promise<PicoEyePose | null> {
    const p = await runtime()?.getEyePose();
    if (!p) return null;
    return {
      leftGazeOrigin: vec3(p.leftGazeOrigin),
      leftGazeDirection: vec3(p.leftGazeDirection),
      rightGazeOrigin: vec3(p.rightGazeOrigin),
      rightGazeDirection: vec3(p.rightGazeDirection),
      leftOpenness: nn(p.leftOpenness),
      rightOpenness: nn(p.rightOpenness),
      leftPupilDiameterMm: nn(p.leftPupilDiameterMm),
      rightPupilDiameterMm: nn(p.rightPupilDiameterMm),
    };
  },
  async enableFaceTracking(): Promise<boolean> {
    return requireRuntime().enableFaceTracking();
  },
  async disableFaceTracking(): Promise<boolean> {
    return requireRuntime().disableFaceTracking();
  },
  async getFaceWeights(): Promise<Record<string, number> | null> {
    return nn(await runtime()?.getFaceWeights());
  },
  async enableBodyTracking(): Promise<boolean> {
    return requireRuntime().enableBodyTracking();
  },
  async disableBodyTracking(): Promise<boolean> {
    return requireRuntime().disableBodyTracking();
  },
  async getBodyJoints(): Promise<PicoBodyJoint[] | null> {
    const joints = await runtime()?.getBodyJoints();
    if (!joints) return null;
    return joints.map((j) => ({
      joint: j.joint,
      position: vec3(j.position)!,
      rotation: quat(j.rotation),
      confidence: j.confidence,
    }));
  },
  async enableHandTracking(): Promise<boolean> {
    return requireRuntime().enableHandTracking();
  },
  async disableHandTracking(): Promise<boolean> {
    return requireRuntime().disableHandTracking();
  },
  async getHandPose(): Promise<PicoHandPose | null> {
    const pose = await runtime()?.getHandPose();
    if (!pose) return null;
    const side = (s: typeof pose.leftHand) =>
      s
        ? {
            joints: s.joints.map((j) => ({
              position: vec3(j.position)!,
              rotation: quat(j.rotation),
            })),
            confidence: s.confidence,
          }
        : null;
    return {
      leftHand: side(pose.leftHand),
      rightHand: side(pose.rightHand),
      aimEnabled: pose.aimEnabled,
    };
  },

  // ── Spatial ───────────────────────────────────────────────────────────────
  async isBoundaryVisible(): Promise<boolean | null> {
    return nn(await runtime()?.isBoundaryVisible());
  },
  async setBoundaryVisible(visible: boolean): Promise<boolean> {
    return requireRuntime().setBoundaryVisible(visible);
  },
  async getBoundaryGeometry(): Promise<number[][] | null> {
    const pts = await runtime()?.getBoundaryGeometry();
    return pts ? pts.map((p) => [p.x, p.y, p.z]) : null;
  },
  async refreshSceneMesh(): Promise<boolean> {
    return requireRuntime().refreshSceneMesh();
  },
  async getSceneMeshTriangleCount(): Promise<number | null> {
    return nn(await runtime()?.getSceneMeshTriangleCount());
  },
  async getDetectedPlanes(): Promise<PicoDetectedPlane[] | null> {
    const planes = await runtime()?.getDetectedPlanes();
    if (!planes) return null;
    return planes.map((p) => ({
      id: p.id,
      label: p.label,
      center: vec3(p.center)!,
      extent: [p.extent.width, p.extent.height] as [number, number],
      normal: vec3(p.normal)!,
    }));
  },
  async refreshScene(): Promise<boolean> {
    return requireRuntime().refreshScene();
  },

  // ── Controllers, haptics, trackers ────────────────────────────────────────
  async getControllers(): Promise<PicoController[] | null> {
    return nn(await runtime()?.getControllers());
  },
  async triggerHaptic(
    hand: 'left' | 'right',
    amplitude: number,
    durationMs: number
  ): Promise<boolean> {
    return requireRuntime().triggerHaptic(hand, amplitude, durationMs);
  },
  async getMotionTrackers(): Promise<PicoMotionTracker[] | null> {
    const trackers = await runtime()?.getMotionTrackers();
    if (!trackers) return null;
    return trackers.map((t) => ({
      id: t.id,
      attachment: t.attachment,
      connected: t.connected,
      position: vec3(t.position)!,
      rotation: quat(t.rotation),
      batteryPct: t.batteryPct,
    }));
  },

  // ── Sensors + spatial audio ───────────────────────────────────────────────
  async getHighRateSensors(): Promise<PicoHighRateSensor[]> {
    return (await runtime()?.getHighRateSensors()) ?? [];
  },
  async isSpatialAudioEnabled(): Promise<boolean | null> {
    return nn(await runtime()?.isSpatialAudioEnabled());
  },
  async setSpatialAudioEnabled(enabled: boolean): Promise<boolean> {
    return requireRuntime().setSpatialAudioEnabled(enabled);
  },
  async getHrtfProfile(): Promise<string | null> {
    return nn(await runtime()?.getHrtfProfile());
  },
};

export default ExpoPicoModule;
