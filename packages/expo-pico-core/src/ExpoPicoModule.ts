import { resolveHybridObject } from '@expo-pico/platform-service-common';

import type { PicoCore } from './PicoCore.nitro';
import type { PicoRuntime, PicoVec3, PicoQuat } from './PicoRuntime.nitro';
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
 * Nitro-backed replacement for the former Expo Modules default export.
 *
 * Keeps the exact shape the rest of the package already consumes — sync
 * properties, `| null` rather than optionals, and positional tuples for
 * vectors — so capabilities.ts, diagnostics.ts and types.ts need no changes
 * and the public API is unchanged. Struct/tuple and undefined/null
 * translation happens here and nowhere else.
 */

function core(): PicoCore | null {
  return resolveHybridObject<PicoCore>('PicoCore');
}

function runtime(): PicoRuntime | null {
  return resolveHybridObject<PicoRuntime>('PicoRuntime');
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
