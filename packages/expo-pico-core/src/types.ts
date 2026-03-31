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

export interface PicoRuntimeInfo {
  isPicoBuild: boolean;
  isPicoDevice: boolean;
  spatialMode: PicoSpatialMode;
  targetProfile: PicoTargetProfileRuntime;
  containerMode: 'window-container' | 'stage' | 'none';
  picoAppId: string | null;
  picoOsVersion: string | null;
  deviceModel: string | null;
  emulatorOptimizations: boolean;
}

export interface ExpoPicoModuleInterface {
  isPicoBuild: boolean;
  isPicoDevice: boolean;
  spatialMode: string;
  targetProfile: string;
  containerMode: string;
  picoAppId: string | null;
  picoOsVersion: string | null;
  deviceModel: string | null;
  emulatorOptimizations: boolean;
}
