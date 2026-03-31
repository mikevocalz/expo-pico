import { requireNativeModule } from 'expo-modules-core';
import type { ExpoPicoSpatialModuleInterface } from './types';

// On non-Android or non-PICO builds, the native module won't be present.
// We provide a safe no-op fallback so import doesn't throw.
const fallback: ExpoPicoSpatialModuleInterface = {
  spaceState: 'unknown',
  containerType: 'none',
  spatialSdkVersion: null,
  capabilities: {
    spaceStates: false,
    spatialAnchors: false,
    sceneUnderstanding: false,
    passthrough: false,
    handTracking: false,
    spatialSdkAvailable: false,
  },
};

let nativeModule: ExpoPicoSpatialModuleInterface;
try {
  nativeModule = requireNativeModule<ExpoPicoSpatialModuleInterface>('ExpoPicoSpatial');
} catch {
  nativeModule = fallback;
}

export default nativeModule;
