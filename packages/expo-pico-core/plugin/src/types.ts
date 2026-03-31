/**
 * Configuration options for the expo-pico-core config plugin.
 */
export interface PicoPluginOptions {
  enabled?: boolean;
  picoAppId?: string;
  /**
   * Build variant strategy.
   * - 'mobile': Standard Android only, no PICO flavor
   * - 'pico': Adds pico product flavor alongside mobile
   * - 'dual': Both mobile and pico flavors, plus a dual-target variant
   * @default 'pico'
   */
  buildVariant?: 'mobile' | 'pico' | 'dual';
  /**
   * Target hardware profile.
   * - 'auto': Detect from targetDevices (default)
   * - 'legacy': PICO Neo3 / pre-OS6 devices
   * - 'pico4': PICO 4 / PICO 4E
   * - 'pico4ultra': PICO 4 Ultra
   * - 'swan': Project Swan / PICO OS 6 next-gen spatial target
   * @default 'auto'
   */
  targetProfile?: 'auto' | 'legacy' | 'pico4' | 'pico4ultra' | 'swan';
  targetDevices?: PicoDeviceTarget[];
  /**
   * Spatial rendering mode.
   * - '2d': Standard flat Android rendering
   * - 'windowed': WindowContainer in Shared Space
   * - 'shared-space': App runs in PICO OS Shared Space (multi-app layer)
   * - 'full-space': App takes over the full spatial environment
   * - 'immersive': Legacy full-immersive mode (pre-OS6)
   * @default '2d'
   */
  spatialMode?: PicoSpatialMode;
  /**
   * Default container type for spatial content.
   * - 'window-container': Floating panel (WindowContainer)
   * - 'stage': 3D stage environment (Stage)
   * - 'none': No spatial container declared
   * @default 'none'
   */
  defaultContainerMode?: 'window-container' | 'stage' | 'none';
  handTracking?: boolean;
  passthrough?: boolean;
  sceneUnderstanding?: boolean;
  entitlementCheck?: boolean;
  /**
   * Enable PICO developer tools overlay (OS 6 dev builds only).
   * @default false
   */
  developerTools?: boolean;
  /**
   * Optimize build output for PICO OS 6 emulator (Project Swan emulator).
   * Disables hardware-required feature assertions for emulator runs.
   * @default false
   */
  enableEmulatorOptimizations?: boolean;
  minSdkVersion?: number;
  targetSdkVersion?: number;
}

export type PicoDeviceTarget = 'pico-4' | 'pico-4-ultra' | 'neo3' | 'swan';

export type PicoSpatialMode =
  | '2d'
  | 'windowed'
  | 'shared-space'
  | 'full-space'
  | 'immersive';

export type PicoTargetProfile = 'auto' | 'legacy' | 'pico4' | 'pico4ultra' | 'swan';

export interface ResolvedPicoOptions {
  enabled: boolean;
  picoAppId: string;
  buildVariant: 'mobile' | 'pico' | 'dual';
  targetProfile: PicoTargetProfile;
  targetDevices: PicoDeviceTarget[];
  spatialMode: PicoSpatialMode;
  defaultContainerMode: 'window-container' | 'stage' | 'none';
  handTracking: boolean;
  passthrough: boolean;
  sceneUnderstanding: boolean;
  entitlementCheck: boolean;
  developerTools: boolean;
  enableEmulatorOptimizations: boolean;
  minSdkVersion: number;
  targetSdkVersion: number;
}

export const PICO_OPTION_DEFAULTS: ResolvedPicoOptions = {
  enabled: true,
  picoAppId: '',
  buildVariant: 'pico',
  targetProfile: 'auto',
  targetDevices: [],
  spatialMode: '2d',
  defaultContainerMode: 'none',
  handTracking: false,
  passthrough: false,
  sceneUnderstanding: false,
  entitlementCheck: false,
  developerTools: false,
  enableEmulatorOptimizations: false,
  minSdkVersion: 32,
  targetSdkVersion: 34,
};

export function resolveOptions(options: PicoPluginOptions = {}): ResolvedPicoOptions {
  return {
    ...PICO_OPTION_DEFAULTS,
    ...options,
    targetDevices: options.targetDevices ?? PICO_OPTION_DEFAULTS.targetDevices,
  };
}

/**
 * Resolve the effective target profile from options.
 * When 'auto', infer from targetDevices.
 */
export function resolveTargetProfile(options: ResolvedPicoOptions): Exclude<PicoTargetProfile, 'auto'> {
  if (options.targetProfile !== 'auto') return options.targetProfile as Exclude<PicoTargetProfile, 'auto'>;
  const devices = options.targetDevices;
  if (devices.includes('swan')) return 'swan';
  if (devices.includes('pico-4-ultra')) return 'pico4ultra';
  if (devices.includes('pico-4')) return 'pico4';
  if (devices.includes('neo3')) return 'legacy';
  return 'pico4'; // sensible default when no devices specified
}
