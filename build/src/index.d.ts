import { type Subscription } from '@expo-pico/platform-service-common';
import type { PicoSpaceState, PicoContainerType, SpatialCapabilities, SpatialAnchorHandle, SpatialPose, WindowContainerProperties, GazePose, SceneMesh, FaceBlendShapes, BodyJoint } from './types';
export * from './types';
export * from './layout';
import { type PicoSpatialLayoutBridgeStatus } from './layout';
/**
 * Current space state.
 *
 * - 'shared-space': other apps visible; this one runs in a WindowContainer
 * - 'full-space': exclusive use of the spatial environment
 * - 'unknown': not PICO OS 6, or not yet determined
 */
export declare function getSpaceState(): PicoSpaceState;
export declare function getContainerType(): PicoContainerType;
export declare function getSpatialCapabilities(): SpatialCapabilities;
export declare function getSpatialSdkVersion(): string | null;
export declare function getSpatialSdkProbe(): Record<string, boolean>;
/**
 * Status of the native WindowContainer bridge. Never throws: a missing or
 * outdated native module is reported through `reason`.
 */
export declare function getLayoutBridgeStatus(): PicoSpatialLayoutBridgeStatus;
export declare function getSpatialLayoutReadiness(): import("./layout").PicoSpatialLayoutReadiness;
export interface WindowContainerOptions {
    /** Passed through to the SDK to tell apart containers that share an id. */
    tag?: string;
}
export type WindowContainerResult = {
    ok: true;
} | {
    ok: false;
    reason: string;
};
/**
 * Opens a PICO OS 6 WindowContainer named `id` hosting the app's current
 * activity. On PICO OS 5, phones, or builds without the Spatial SDK
 * (`enableSpatialSdk`), resolves to `{ ok: false, reason }` and never throws.
 *
 * `ok: true` means the SDK call returned without throwing. The SDK gives no
 * completion signal, so it does not confirm the window is on screen yet.
 */
export declare function openWindowContainer(id: string, options?: WindowContainerOptions): WindowContainerResult;
/** Closes the WindowContainer opened with the same `id` and `tag`. */
export declare function closeWindowContainer(id: string, options?: WindowContainerOptions): WindowContainerResult;
/**
 * Creates a spatial anchor at the given pose.
 *
 * Requires the legacy PVR Spatial SDK 1.x AAR in `vendor/pico-sdk/` or
 * `android/app/libs/` — distinct from the PPS Maven artifacts that
 * expo-pico-core resolves automatically — plus a PICO 4 Ultra or Neo3 on
 * PICO OS 6+.
 *
 * Rejects with SERVICE_UNAVAILABLE when the SDK is absent, VALIDATION_ERROR
 * for a malformed pose.
 */
export declare function createSpatialAnchor(pose: SpatialPose): Promise<SpatialAnchorHandle>;
export declare function setWindowContainerProperties(props: WindowContainerProperties): Promise<void>;
export declare function requestFullSpace(): Promise<void>;
/**
 * Per-frame eye gaze updates, at vsync on hardware that supports it. On
 * unsupported devices the subscription is returned but never fires.
 */
export declare function addGazeListener(cb: (g: GazePose) => void): Subscription;
/** One-shot gaze snapshot; null when eye gaze is unavailable. */
export declare function getGazeSnapshot(): Promise<GazePose | null>;
export declare function isEyeGazeAvailable(): boolean;
/**
 * Current scene mesh. Native returns flat number arrays; they are normalised
 * here to Float32Array / Uint32Array.
 *
 * Rejects with SERVICE_UNAVAILABLE when the Spatial SDK is absent.
 */
export declare function getSceneMesh(): Promise<SceneMesh>;
/** Payload is normalised to typed arrays before the callback fires. */
export declare function addSceneMeshUpdateListener(cb: (m: SceneMesh) => void): Subscription;
export declare function isSceneMeshAvailable(): boolean;
/** Per-frame blendshape updates at vsync. Never fires on unsupported runtimes. */
export declare function addFaceListener(cb: (b: FaceBlendShapes) => void): Subscription;
export declare function isFaceTrackingAvailable(): boolean;
/** Per-frame body joint updates at vsync. Never fires on unsupported runtimes. */
export declare function addBodyListener(cb: (joints: BodyJoint[]) => void): Subscription;
export declare function isBodyTrackingAvailable(): boolean;
//# sourceMappingURL=index.d.ts.map