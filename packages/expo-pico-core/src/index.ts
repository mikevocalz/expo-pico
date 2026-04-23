import ExpoPicoModule from './ExpoPicoModule';
import type {
  PicoRuntimeInfo,
  PicoSpatialMode,
  PicoTargetProfileRuntime,
  PicoXRMode,
} from './types';

export type {
  PicoRuntimeInfo,
  PicoSpatialMode,
  PicoTargetProfileRuntime,
  PicoXRMode,
  ExpoPicoModuleInterface,
} from './types';

export function isPicoBuild(): boolean {
  return ExpoPicoModule.isPicoBuild ?? false;
}

export function isPicoDevice(): boolean {
  return ExpoPicoModule.isPicoDevice ?? false;
}

export function getSpatialMode(): PicoSpatialMode {
  const mode = ExpoPicoModule.spatialMode;
  const valid: PicoSpatialMode[] = ['2d', 'windowed', 'shared-space', 'full-space', 'immersive'];
  return valid.includes(mode as PicoSpatialMode) ? (mode as PicoSpatialMode) : '2d';
}

export function getPicoTargetProfile(): PicoTargetProfileRuntime {
  const profile = ExpoPicoModule.targetProfile;
  const valid: PicoTargetProfileRuntime[] = ['legacy', 'pico4', 'pico4ultra', 'swan', 'unknown'];
  return valid.includes(profile as PicoTargetProfileRuntime)
    ? (profile as PicoTargetProfileRuntime)
    : 'unknown';
}

/**
 * Returns the active PICO XR mode. Mirrors the plugin-time `xrMode` option
 * and the native `PicoXRPlatform` enum.
 */
export function getXrMode(): PicoXRMode {
  const mode = ExpoPicoModule.xrMode;
  if (mode === 'pico-os6' || mode === 'pico-swan') return mode;
  return 'mobile';
}

/** Convenience: `true` when the active runtime is Project Swan. */
export function isSwanRuntime(): boolean {
  return getXrMode() === 'pico-swan';
}

export function getPicoRuntimeInfo(): PicoRuntimeInfo {
  return {
    isPicoBuild: isPicoBuild(),
    isPicoDevice: isPicoDevice(),
    spatialMode: getSpatialMode(),
    targetProfile: getPicoTargetProfile(),
    containerMode: (() => {
      const m = ExpoPicoModule.containerMode;
      if (m === 'window-container' || m === 'stage') return m;
      return 'none';
    })(),
    xrMode: getXrMode(),
    picoAppId: ExpoPicoModule.picoAppId ?? null,
    picoOsVersion: ExpoPicoModule.picoOsVersion ?? null,
    deviceModel: ExpoPicoModule.deviceModel ?? null,
    emulatorOptimizations: ExpoPicoModule.emulatorOptimizations ?? false,
    swanRuntimeInitialized: ExpoPicoModule.swanRuntimeInitialized ?? false,
    os6RuntimeInitialized: ExpoPicoModule.os6RuntimeInitialized ?? false,
  };
}

export default ExpoPicoModule;
