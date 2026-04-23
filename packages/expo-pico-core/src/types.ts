export type PicoSpatialMode =
  | '2d'
  | 'windowed'
  | 'shared-space'
  | 'full-space'
  | 'immersive';

export type PicoTargetProfileRuntime =
  | 'legacy'
  | 'pico4'
  | 'pico4ultra'
  | 'swan'
  | 'unknown';

/**
 * Active PICO XR platform mode (runtime view of the plugin-time `xrMode`
 * option). Mirrors the native `PicoXRPlatform` enum.
 *   - `mobile`:    Standard Android; no PICO runtime registered.
 *   - `pico-os6`:  Standard PICO OS 6 runtime active.
 *   - `pico-swan`: Project Swan / next-gen spatial runtime active.
 */
export type PicoXRMode = 'mobile' | 'pico-os6' | 'pico-swan';

export interface PicoRuntimeInfo {
  isPicoBuild: boolean;
  isPicoDevice: boolean;
  spatialMode: PicoSpatialMode;
  targetProfile: PicoTargetProfileRuntime;
  containerMode: 'window-container' | 'stage' | 'none';
  xrMode: PicoXRMode;
  picoAppId: string | null;
  picoOsVersion: string | null;
  deviceModel: string | null;
  emulatorOptimizations: boolean;
  swanRuntimeInitialized: boolean;
  os6RuntimeInitialized: boolean;
}

export interface ExpoPicoModuleInterface {
  isPicoBuild: boolean;
  isPicoDevice: boolean;
  spatialMode: string;
  targetProfile: string;
  containerMode: string;
  xrMode: string;
  picoAppId: string | null;
  picoOsVersion: string | null;
  deviceModel: string | null;
  emulatorOptimizations: boolean;
  swanRuntimeInitialized: boolean;
  os6RuntimeInitialized: boolean;
}
