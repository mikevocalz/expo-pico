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
   * PICO Platform Service SDK identity. Written to `strings.xml` (for
   * `CoreService.Initialize` / `PlatformInitializer`), mirrored into
   * BuildConfig, and — when at least `picoAppId` is present — two
   * login/payment activities are declared in the PICO-flavor manifest
   * (`com.pico.loginpaysdk.UnityAuthInterface`,
   * `…component.PicoSDKBrowser`) so the Platform SDK auth and payment
   * flows bind correctly.
   *
   * All fields are optional. Provide only what your app uses:
   *   - `account`, `leaderboards`, `achievements`, `rooms`, `rtc`,
   *     `storage`, `social`: require `picoAppId` + `picoAppKey`.
   *   - `iap`: additionally requires `picoMerchantId` + `picoPayKey`.
   *
   * Regions. PICO ships two SDK variants: CN and Global. Consumers
   * targeting both regions publish two APKs but share the same source
   * tree; the `_foreign` string resources carry the Global-variant IDs
   * while the un-suffixed resources carry the CN-variant IDs (or
   * vice-versa — the SDK reads whichever set matches its bundled region).
   * Leave `platformService.foreign` undefined for single-region apps.
   *
   * Source: PICO Platform Service SDK integration docs (legacy Native SDK
   * Ch. 7 for IAP; Unity `CoreService` reference for account surface).
   */
  platformService?: PicoPlatformServicePluginOptions;
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
   * Declare eye-tracking hardware support. Emits
   * `uses-feature pico.hardware.eyetracking` and the matching
   * `com.picovr.permission.EYE_TRACKING` permission. Devices without
   * eye-tracking hardware continue to install because the feature is
   * declared `android:required="false"`.
   * @default false
   */
  eyeTracking?: boolean;
  /**
   * Declare face-tracking hardware support (upper + lower face).
   * Emits `uses-feature pico.hardware.facetracking` and the matching
   * `com.picovr.permission.FACE_TRACKING` permission.
   * @default false
   */
  faceTracking?: boolean;
  /**
   * Declare PICO Motion Tracker body-tracking support.
   * EXTENSION SEAM — both the feature key
   * (`pico.hardware.bodytracking`) and the permission
   * (`com.picovr.permission.BODY_TRACKING`) are best-known names that
   * are not yet confirmed in open PICO docs. Turning this on emits
   * both, which is a conservative no-op on PICO OS versions that do
   * not recognize them.
   * @default false
   */
  bodyTracking?: boolean;
  /**
   * Declare PICO spatial audio support.
   * EXTENSION SEAM — feature key (`pico.hardware.spatialaudio`) is
   * inferred from PICO developer nav; exact name pending
   * confirmation.
   * @default false
   */
  spatialAudio?: boolean;
  /**
   * Opt into PICO foveated rendering. Emits
   * `<meta-data android:name="com.pico.foveation.enabled" android:value="true"/>`
   * plus the `pico.hardware.foveation` uses-feature.
   * EXTENSION SEAM — both keys are best-known names pending doc
   * confirmation.
   * @default false
   */
  foveatedRendering?: boolean;
  /**
   * Request `android.permission.HIGH_SAMPLING_RATE_SENSORS`. Required
   * for any app that needs IMU / accelerometer / gyroscope sampling
   * above 200 Hz. Typical for head-tracked VR. Standard AOSP
   * permission — confirmed.
   * @default false
   */
  highSamplingRateSensors?: boolean;
  /**
   * Declare the display refresh rates (Hz) the app supports. Emits a
   * comma-separated `<meta-data android:name="com.pico.refreshRates"
   * android:value="72,90,120"/>` when non-empty.
   * EXTENSION SEAM — the meta-data key name is not confirmed in open
   * PICO docs. Empty array = no declaration emitted.
   * @default []
   */
  refreshRates?: number[];
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
/**
 * PICO Platform Service identity. All fields optional; each controls a
 * specific subset of the resources written by the plugin.
 */
export interface PicoPlatformServicePluginOptions {
  /** PICO Platform app ID (modern key; `pico_app_id` string resource). */
  picoAppId?: string;
  /** PICO Platform app key (paired with {@link picoAppId}). */
  picoAppKey?: string;
  /** IAP merchant ID (legacy payment SDK; `pico_merchant_id`). */
  picoMerchantId?: string;
  /** IAP payment key (`pico_pay_key`). */
  picoPayKey?: string;
  /**
   * Optional second region's identity. When set, the plugin also writes
   * `pico_app_id_foreign`, `pico_app_key_foreign`,
   * `pico_merchant_id_foreign`, `pico_pay_key_foreign` resources. PICO
   * SDK variants read the right set based on which region binary they
   * ship with.
   */
  foreign?: {
    picoAppId?: string;
    picoAppKey?: string;
    picoMerchantId?: string;
    picoPayKey?: string;
  };
  /**
   * Whether to declare `com.pico.loginpaysdk.UnityAuthInterface` and
   * `com.pico.loginpaysdk.component.PicoSDKBrowser` activities in the
   * PICO-flavor manifest. Required for the Platform SDK auth and
   * payment flows to launch their in-app browsers. No-op when neither
   * `picoAppId` nor `picoAppKey` is set — nothing to authenticate
   * against.
   * @default true when any platformService field is provided
   */
  declareActivities?: boolean;
}

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

export interface ResolvedPicoPlatformServiceOptions {
  picoAppId: string | null;
  picoAppKey: string | null;
  picoMerchantId: string | null;
  picoPayKey: string | null;
  foreign: {
    picoAppId: string | null;
    picoAppKey: string | null;
    picoMerchantId: string | null;
    picoPayKey: string | null;
  };
  declareActivities: boolean;
  /** Derived: true iff at least one identity field is non-null. */
  hasIdentity: boolean;
  /** Derived: true iff both `picoMerchantId` and `picoPayKey` are non-null. */
  hasIapIdentity: boolean;
}

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
  platformService: ResolvedPicoPlatformServiceOptions;
  targetProfile: PicoTargetProfile;
  targetDevices: PicoDeviceTarget[];
  spatialMode: PicoSpatialMode;
  defaultContainerMode: 'window-container' | 'stage' | 'none';
  handTracking: boolean;
  passthrough: boolean;
  sceneUnderstanding: boolean;
  entitlementCheck: boolean;
  eyeTracking: boolean;
  faceTracking: boolean;
  bodyTracking: boolean;
  spatialAudio: boolean;
  foveatedRendering: boolean;
  highSamplingRateSensors: boolean;
  refreshRates: number[];
  developerTools: boolean;
  enableEmulatorOptimizations: boolean;
  minSdkVersion: number;
  targetSdkVersion: number;
}

/**
 * Default resolved platform-service state for an app with no identity
 * wired. `declareActivities` is `false` here because the resolver
 * activates it only when `hasIdentity` is true (no point declaring
 * login/browser activities for an app that cannot authenticate).
 */
export const PICO_PLATFORM_SERVICE_DEFAULTS: ResolvedPicoPlatformServiceOptions = {
  picoAppId: null,
  picoAppKey: null,
  picoMerchantId: null,
  picoPayKey: null,
  foreign: {
    picoAppId: null,
    picoAppKey: null,
    picoMerchantId: null,
    picoPayKey: null,
  },
  declareActivities: false,
  hasIdentity: false,
  hasIapIdentity: false,
};

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
  platformService: PICO_PLATFORM_SERVICE_DEFAULTS,
  targetProfile: 'auto',
  targetDevices: [],
  spatialMode: '2d',
  defaultContainerMode: 'none',
  handTracking: false,
  passthrough: false,
  sceneUnderstanding: false,
  entitlementCheck: false,
  eyeTracking: false,
  faceTracking: false,
  bodyTracking: false,
  spatialAudio: false,
  foveatedRendering: false,
  highSamplingRateSensors: false,
  refreshRates: [],
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

  const platformService = resolvePlatformServiceOptions(
    options.platformService,
    /* legacyPicoAppId */ options.picoAppId
  );

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
    platformService,
    minSdkVersion,
    targetDevices: options.targetDevices ?? PICO_OPTION_DEFAULTS.targetDevices,
    // Copy refreshRates to avoid mutating user input, and filter out
    // non-positive / non-finite entries that would produce invalid
    // meta-data values.
    refreshRates: (options.refreshRates ?? PICO_OPTION_DEFAULTS.refreshRates)
      .filter((hz) => Number.isFinite(hz) && hz > 0)
      .map((hz) => Math.round(hz)),
  };
}

/**
 * Resolve platform-service identity. Falls back to top-level `picoAppId`
 * (the legacy field already in `PicoPluginOptions`) when
 * `platformService.picoAppId` is not provided, so apps that only use the
 * legacy surface keep working without changes.
 */
function resolvePlatformServiceOptions(
  options: PicoPlatformServicePluginOptions | undefined,
  legacyPicoAppId: string | undefined
): ResolvedPicoPlatformServiceOptions {
  const raw = options ?? {};
  const foreignRaw = raw.foreign ?? {};

  const picoAppId = nonEmpty(raw.picoAppId) ?? nonEmpty(legacyPicoAppId);
  const picoAppKey = nonEmpty(raw.picoAppKey);
  const picoMerchantId = nonEmpty(raw.picoMerchantId);
  const picoPayKey = nonEmpty(raw.picoPayKey);

  const foreign = {
    picoAppId: nonEmpty(foreignRaw.picoAppId),
    picoAppKey: nonEmpty(foreignRaw.picoAppKey),
    picoMerchantId: nonEmpty(foreignRaw.picoMerchantId),
    picoPayKey: nonEmpty(foreignRaw.picoPayKey),
  };

  const hasIdentity = Boolean(
    picoAppId ||
      picoAppKey ||
      foreign.picoAppId ||
      foreign.picoAppKey ||
      picoMerchantId ||
      picoPayKey ||
      foreign.picoMerchantId ||
      foreign.picoPayKey
  );

  const hasIapIdentity = Boolean(
    (picoMerchantId && picoPayKey) ||
      (foreign.picoMerchantId && foreign.picoPayKey)
  );

  return {
    picoAppId,
    picoAppKey,
    picoMerchantId,
    picoPayKey,
    foreign,
    declareActivities: raw.declareActivities ?? hasIdentity,
    hasIdentity,
    hasIapIdentity,
  };
}

function nonEmpty(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
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
