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
   * Native XR runtime mode that drives MainApplication package registration
   * and platform-specific subproject wiring. Orthogonal to {@link targetProfile}:
   * `targetProfile` is a runtime hardware family hint, while `xrMode` selects
   * which native runtime is registered at boot.
   *
   * - 'mobile': No PICO runtime registration. The PicoCorePackage is still
   *   registered but in a no-op MOBILE platform mode.
   * - 'pico-os6': Standard PICO OS 6 runtime registration. Default for
   *   `buildVariant: 'pico'` and `'dual'`.
   * - 'pico-swan': Project Swan / next-gen spatial runtime. Adds Swan-only
   *   manifest meta-data, an optional Swan SDK Maven dependency, an optional
   *   Swan runtime Gradle subproject inclusion via settings.gradle, and
   *   constructs PicoCorePackage with PicoXRPlatform.PICO_SWAN at boot.
   *
   * @default 'pico-os6' when buildVariant is 'pico' or 'dual', otherwise 'mobile'
   */
  xrMode?: PicoXRMode;
  /**
   * Swan-mode-specific options. Only consulted when {@link xrMode} === `'pico-swan'`.
   */
  picoSwan?: PicoSwanPluginOptions;
  /**
   * Launcher contract app type. Drives the `pvr.app.type` meta-data and the
   * set of launcher activity intent-filter categories injected for the PICO
   * flavor. Orthogonal to `xrMode`: `xrMode` selects the native runtime,
   * `appType` selects how the PICO launcher enumerates the APK.
   *
   * Default behavior:
   *   - `xrMode: 'mobile'`        → `appType: '2d'`
   *   - `xrMode: 'pico-os6'`      → `appType: 'vr'`
   *   - `xrMode: 'pico-swan'`     → `appType: 'vr'` (set explicitly to
   *                                 `'mr'` if your Swan app is a passthrough-
   *                                 first MR experience)
   *
   * Precedence: when `xrMode === 'mobile'`, an explicit `appType: 'vr'` /
   * `'mr'` is honored but a warning is emitted because no PICO native
   * package is registered to back the immersive contract.
   */
  appType?: PicoAppType;
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

/**
 * Swan-mode-specific plugin options. None of these are required — every
 * field is an extension seam for the public PICO Swan / Spatial SDK once
 * its surface stabilizes.
 */
export interface PicoSwanPluginOptions {
  /**
   * Optional Swan runtime Gradle subproject path, relative to the consuming
   * app's `android/` directory. When provided, the plugin appends an
   * `include`/`projectDir` pair to `settings.gradle` and an
   * `implementation project(':<name>')` line to `app/build.gradle`.
   *
   * Example: `'../node_modules/@pico/swan-runtime-android/android'`.
   *
   * Leave undefined when no local Swan SDK subproject is available — the
   * plugin still wires manifest meta-data and native package registration.
   */
  swanRuntimeProject?: {
    /** Gradle module name without the leading colon, e.g. `'pico_swan_runtime'`. */
    name: string;
    /** Filesystem path to the subproject, relative to `android/`. */
    path: string;
  };
  /**
   * Optional Swan SDK Maven coordinates injected into `app/build.gradle`'s
   * dependency block. The PICO Maven repo is already injected by the core
   * plugin. No-op when undefined.
   *
   * Example: `'com.pvr.swan:pvr-swan-runtime:0.1.0'`.
   */
  swanSdkArtifact?: string;
  /**
   * Whether to declare the Swan spatial-container category on the launcher
   * activity via the PICO-flavor manifest. Currently writes a meta-data
   * tag `com.pico.swan.spatialContainer` for the launcher activity's parent
   * application — the actual category name will be finalized when PICO ships
   * the public Swan launcher contract.
   * @default true when xrMode === 'pico-swan'
   */
  declareSpatialContainerCategory?: boolean;
  /**
   * Override min SDK for the pico flavor when targeting Swan. Swan
   * historically requires API 33+; this lifts the default 32 floor when
   * `xrMode === 'pico-swan'`.
   * @default 33
   */
  swanMinSdkVersion?: number;
  /**
   * When true, scaffolds a `picoSwan` Kotlin source set under
   * `android/app/src/picoSwan/` populated with a single `PicoSwanBootstrap.kt`
   * file. Useful when the consuming app wants to add Swan-only Kotlin
   * without polluting the shared `pico` flavor.
   * @default false
   */
  scaffoldSwanSourceSet?: boolean;
}

export type PicoXRMode = 'mobile' | 'pico-os6' | 'pico-swan';

/**
 * Launcher contract app type. Drives the `pvr.app.type` meta-data PICO OS 6
 * reads to decide how to enumerate the APK on the launcher.
 *
 *   - 'vr':  Immersive VR app. Adds OpenXR `IMMERSIVE_HMD` and PICO
 *            launcher categories to the launcher activity intent-filter.
 *   - 'mr':  Mixed-reality app. Same launcher categories as 'vr'; the
 *            difference is the meta-data value, which affects how PICO OS
 *            primes passthrough at boot.
 *   - '2d':  Standard 2D Android app. No immersive launcher categories
 *            are added. Use for `xrMode: 'mobile'` builds; also valid for
 *            companion 2D apps shipped alongside an immersive flavor.
 */
export type PicoAppType = 'vr' | 'mr' | '2d';

export type PicoDeviceTarget = 'pico-4' | 'pico-4-ultra' | 'neo3' | 'swan';

export type PicoSpatialMode =
  | '2d'
  | 'windowed'
  | 'shared-space'
  | 'full-space'
  | 'immersive';

export type PicoTargetProfile = 'auto' | 'legacy' | 'pico4' | 'pico4ultra' | 'swan';

export interface ResolvedPicoSwanOptions {
  swanRuntimeProject: { name: string; path: string } | null;
  swanSdkArtifact: string | null;
  declareSpatialContainerCategory: boolean;
  swanMinSdkVersion: number;
  scaffoldSwanSourceSet: boolean;
}

export interface ResolvedPicoOptions {
  enabled: boolean;
  picoAppId: string;
  buildVariant: 'mobile' | 'pico' | 'dual';
  xrMode: PicoXRMode;
  picoSwan: ResolvedPicoSwanOptions;
  appType: PicoAppType;
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

export const PICO_SWAN_DEFAULTS: ResolvedPicoSwanOptions = {
  swanRuntimeProject: null,
  swanSdkArtifact: null,
  declareSpatialContainerCategory: true,
  swanMinSdkVersion: 33,
  scaffoldSwanSourceSet: false,
};

export const PICO_OPTION_DEFAULTS: ResolvedPicoOptions = {
  enabled: true,
  picoAppId: '',
  buildVariant: 'pico',
  xrMode: 'pico-os6',
  picoSwan: PICO_SWAN_DEFAULTS,
  appType: 'vr',
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
  const buildVariant = options.buildVariant ?? PICO_OPTION_DEFAULTS.buildVariant;
  const defaultXrMode: PicoXRMode = buildVariant === 'mobile' ? 'mobile' : 'pico-os6';

  const swan: ResolvedPicoSwanOptions = {
    ...PICO_SWAN_DEFAULTS,
    ...(options.picoSwan ?? {}),
    swanRuntimeProject:
      options.picoSwan?.swanRuntimeProject !== undefined
        ? options.picoSwan.swanRuntimeProject ?? null
        : PICO_SWAN_DEFAULTS.swanRuntimeProject,
    swanSdkArtifact:
      options.picoSwan?.swanSdkArtifact !== undefined
        ? options.picoSwan.swanSdkArtifact ?? null
        : PICO_SWAN_DEFAULTS.swanSdkArtifact,
  };

  const xrMode = options.xrMode ?? defaultXrMode;

  // appType default tracks xrMode. Mobile builds default to 2d (no immersive
  // launcher categories injected); PICO modes default to vr. The user can
  // override with 'mr' for passthrough-first apps.
  const appType: PicoAppType =
    options.appType ?? (xrMode === 'mobile' ? '2d' : 'vr');

  // When xrMode is 'pico-swan', lift minSdkVersion floor to Swan's
  // documented requirement unless the user explicitly overrides it.
  const minSdkVersion =
    options.minSdkVersion ??
    (xrMode === 'pico-swan' ? swan.swanMinSdkVersion : PICO_OPTION_DEFAULTS.minSdkVersion);

  return {
    ...PICO_OPTION_DEFAULTS,
    ...options,
    buildVariant,
    xrMode,
    picoSwan: swan,
    appType,
    minSdkVersion,
    targetDevices: options.targetDevices ?? PICO_OPTION_DEFAULTS.targetDevices,
  };
}

/**
 * Resolve the effective target profile from options.
 * When 'auto', infer from targetDevices, then from xrMode.
 */
export function resolveTargetProfile(
  options: ResolvedPicoOptions
): Exclude<PicoTargetProfile, 'auto'> {
  if (options.targetProfile !== 'auto') {
    return options.targetProfile as Exclude<PicoTargetProfile, 'auto'>;
  }
  const devices = options.targetDevices;
  if (devices.includes('swan')) return 'swan';
  if (devices.includes('pico-4-ultra')) return 'pico4ultra';
  if (devices.includes('pico-4')) return 'pico4';
  if (devices.includes('neo3')) return 'legacy';
  // When no devices are listed, fall back to xrMode-derived guess.
  if (options.xrMode === 'pico-swan') return 'swan';
  return 'pico4';
}

/**
 * Map the plugin-facing xrMode string to the native PicoXRPlatform enum
 * value rendered into MainApplication and BuildConfig.
 */
export function xrModeToNativeEnum(mode: PicoXRMode): 'MOBILE' | 'PICO_OS6' | 'PICO_SWAN' {
  switch (mode) {
    case 'mobile':
      return 'MOBILE';
    case 'pico-os6':
      return 'PICO_OS6';
    case 'pico-swan':
      return 'PICO_SWAN';
  }
}
