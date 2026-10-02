import { NativeModule } from 'expo';
import { resolveNativeModule } from '@expo-pico/platform-service-common';
import type {
  ExpoPicoSpatialModuleInterface,
  ExpoPicoEyeGazeModuleInterface,
  ExpoPicoSceneMeshModuleInterface,
  ExpoPicoFaceTrackingModuleInterface,
  ExpoPicoBodyTrackingModuleInterface,
} from './types';

declare class ExpoPicoSpatialNativeModule extends NativeModule implements ExpoPicoSpatialModuleInterface {
  readonly spaceState: string;
  readonly containerType: string;
  readonly spatialSdkVersion: string | null;
  readonly capabilities: {
    spaceStates: boolean;
    spatialAnchors: boolean;
    sceneUnderstanding: boolean;
    passthrough: boolean;
    handTracking: boolean;
    spatialSdkAvailable: boolean;
  };
  getSpatialSdkProbe(): Promise<Record<string, boolean>>;
  createSpatialAnchor(pose: object): Promise<{
    id: string; anchorId: string; persisted: boolean;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
  }>;
  setWindowContainerProperties(props: object): Promise<void>;
  requestFullSpace(): Promise<void>;
}

declare class ExpoPicoEyeGazeNativeModule extends NativeModule implements ExpoPicoEyeGazeModuleInterface {
  readonly eyeGazeAvailable: boolean;
  getGazeSnapshot(): Promise<import('./types').GazePose | null>;
  isEyeGazeAvailable(): boolean;
}

declare class ExpoPicoSceneMeshNativeModule extends NativeModule implements ExpoPicoSceneMeshModuleInterface {
  readonly sceneMeshAvailable: boolean;
  getSceneMesh(): Promise<import('./types').SceneMeshRaw>;
  isSceneMeshAvailable(): boolean;
}

declare class ExpoPicoFaceTrackingNativeModule extends NativeModule implements ExpoPicoFaceTrackingModuleInterface {
  readonly faceTrackingAvailable: boolean;
  isFaceTrackingAvailable(): boolean;
}

declare class ExpoPicoBodyTrackingNativeModule extends NativeModule implements ExpoPicoBodyTrackingModuleInterface {
  readonly bodyTrackingAvailable: boolean;
  isBodyTrackingAvailable(): boolean;
}

const _spatial = resolveNativeModule<ExpoPicoSpatialNativeModule>('ExpoPicoSpatial');
const _eyeGaze = resolveNativeModule<ExpoPicoEyeGazeNativeModule>('ExpoPicoEyeGaze');
const _sceneMesh = resolveNativeModule<ExpoPicoSceneMeshNativeModule>('ExpoPicoSceneMesh');
const _faceTracking = resolveNativeModule<ExpoPicoFaceTrackingNativeModule>('ExpoPicoFaceTracking');
const _bodyTracking = resolveNativeModule<ExpoPicoBodyTrackingNativeModule>('ExpoPicoBodyTracking');

export const NativeSpatial = _spatial.available ? _spatial.nativeModule : null;
export const NativeEyeGaze = _eyeGaze.available ? _eyeGaze.nativeModule : null;
export const NativeSceneMesh = _sceneMesh.available ? _sceneMesh.nativeModule : null;
export const NativeFaceTracking = _faceTracking.available ? _faceTracking.nativeModule : null;
export const NativeBodyTracking = _bodyTracking.available ? _bodyTracking.nativeModule : null;

export default NativeSpatial;
