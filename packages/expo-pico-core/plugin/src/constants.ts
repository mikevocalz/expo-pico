export const PICO_MAVEN_REPO = 'https://developer.pico-interactive.com/maven';
export const PICO_SDK_GROUP = 'com.pvr';
export const PICO_PLATFORM_SDK_GROUP = 'com.pvr.platform';
export const PICO_PLATFORM_SDK_VERSION = '3.2.0';
export const PICO_SPATIAL_SDK_VERSION = '1.0.0';

export const MANIFEST_META = {
  PICO_APP_ID: 'pvr.app.id',
  /**
   * Launcher contract meta-data. Read by the PICO OS 6 launcher to decide
   * how to enumerate the APK (immersive VR, mixed reality, or 2D fallback).
   * Source: PICO OpenXR Mobile SDK, Chapter 4.
   *   sdk.picovr.com/docs/OpenXRMobileSDKv2/en/chapter_four.html
   * Lives at <application> scope.
   */
  PVR_APP_TYPE: 'pvr.app.type',
  SUPPORTED_DEVICES: 'com.pico.supportedDevices',
  /**
   * NOTE: Provisional / spatial-runtime metadata, NOT the launcher contract.
   * The launcher contract for immersive enumeration is the combination of
   * `pvr.app.type` (above) plus the OpenXR + PICO launcher-activity
   * categories declared by withPicoLauncherActivity. Do not conflate the
   * two: removing `com.pico.spatial.mode` would not affect immersive
   * enumeration; removing `pvr.app.type` or the launcher categories
   * would.
   */
  SPATIAL_MODE: 'com.pico.spatial.mode',
  CONTAINER_MODE: 'com.pico.spatial.containerMode',
  TARGET_PROFILE: 'com.pico.targetProfile',
  XR_MODE: 'com.pico.xrMode',
  ENTITLEMENT_CHECK: 'pvr.app.entitlement.check',
  DEVELOPER_TOOLS: 'com.pico.developerTools',
  SWAN_SPATIAL_CONTAINER: 'com.pico.swan.spatialContainer',
  SWAN_RUNTIME_VERSION: 'com.pico.swan.runtimeVersion',
  /**
   * Supported display refresh rates in Hz, comma-separated. Read by
   * the PICO OS compositor at boot to decide which refresh-rate target
   * to offer the app. EXTENSION SEAM — the exact meta-data key is not
   * confirmed in open PICO docs. Best-known key; emitted only when the
   * consumer explicitly populates `refreshRates`.
   */
  REFRESH_RATES: 'com.pico.refreshRates',
  /**
   * Foveated rendering opt-in. Value is `"true"` when enabled.
   * EXTENSION SEAM — key name unconfirmed. Emitted only when the
   * consumer explicitly enables `foveatedRendering`.
   */
  FOVEATION_ENABLED: 'com.pico.foveation.enabled',
} as const;

/**
 * Plugin-facing `appType` value → manifest meta-data value rendered into
 * `pvr.app.type`. Confirmed values from PICO OpenXR Mobile SDK Ch. 4.
 */
export const APP_TYPE_MANIFEST_VALUE: Record<string, string> = {
  vr: 'vr',
  mr: 'mr',
  '2d': '2d',
} as const;

/**
 * Launcher activity intent-filter categories that flag an APK as an
 * immersive HMD app to OpenXR loaders and the PICO OS launcher.
 *
 *   - IMMERSIVE_HMD is the Khronos-mandated category any OpenXR runtime
 *     (PICO included) uses to enumerate immersive apps. Source:
 *     khronos.org/openxr (loader spec).
 *   - com.pico.intent.category.VR is the modern PICO launcher category.
 *   - com.picovr.intent.category.VR is the legacy category retained for
 *     PICO OS releases that pre-date the `com.pico` namespace migration.
 *     Adding both is additive and harmless under manifest merging — the
 *     launcher only needs to find one.
 */
export const LAUNCHER_CATEGORIES = {
  OPENXR_IMMERSIVE_HMD: 'org.khronos.openxr.intent.category.IMMERSIVE_HMD',
  PICO_VR: 'com.pico.intent.category.VR',
  PICOVR_VR_LEGACY: 'com.picovr.intent.category.VR',
} as const;

/**
 * PICO system packages an immersive app needs to query at runtime once
 * `targetSdkVersion >= 30` (Android 11 package visibility). Listed in the
 * `<queries>` block of the PICO-flavor manifest so binders to PICO OS
 * services do not silently fail.
 *
 * Conservative list — only the packages an immersive app talks to at boot.
 * Sibling packages (account, IAP, RTC) may add more queries via their own
 * config plugins as their native SDKs are wired.
 */
export const PICO_QUERY_PACKAGES = [
  'com.pico.os.systemui',
  'com.pico.platform',
] as const;

/**
 * Plugin-facing xrMode string → manifest meta-data value rendered into
 * `com.pico.xrMode`. The native PicoXRPlatform enum reads this at boot via
 * BuildConfig.PICO_XR_MODE; the manifest copy lets PICO OS launchers and
 * entitlement checks inspect it without instantiating the app.
 */
export const XR_MODE_MANIFEST_VALUE: Record<string, string> = {
  mobile: 'mobile',
  'pico-os6': 'pico-os6',
  'pico-swan': 'pico-swan',
} as const;

/**
 * Marker used by the MainApplication mod for idempotent insertion. When
 * present in the file the mod is a no-op. The value is part of the
 * inserted block so dedupe works on a re-run with the same xrMode.
 */
export const PICO_MAIN_APP_MARKER = '// expo-pico-core: PicoCorePackage registration';
export const PICO_MAIN_APP_IMPORT_MARKER = '// expo-pico-core: PicoCorePackage import';
export const PICO_SETTINGS_MARKER = '// expo-pico-core: pico subprojects';

export const PICO_FEATURES = {
  HAND_TRACKING: 'pico.hardware.handtracking',
  PASSTHROUGH: 'pico.hardware.passthrough',
  SCENE_UNDERSTANDING: 'pico.software.scene',
  VR_HEADTRACKING: 'android.hardware.vr.headtracking',
  SPATIAL_ANCHOR: 'pico.software.spatialanchor',
  /**
   * PICO 4 Pro / 4 Ultra / Enterprise eye-tracking hardware feature.
   * Follows the `pico.hardware.*` naming pattern used by the
   * hand-tracking and passthrough declarations confirmed in the PICO
   * sample manifests.
   */
  EYE_TRACKING: 'pico.hardware.eyetracking',
  /**
   * PICO 4 Pro / Enterprise face-tracking hardware feature (upper +
   * lower face). Confirmed in PICO Unity face-tracking docs; Android
   * feature key follows the `pico.hardware.*` pattern.
   */
  FACE_TRACKING: 'pico.hardware.facetracking',
  /**
   * PICO Motion Tracker body-tracking feature. EXTENSION SEAM — the
   * feature key is not confirmed in open PICO docs as of this writing.
   * When PICO publishes the canonical name, update this constant.
   */
  BODY_TRACKING: 'pico.hardware.bodytracking',
  /**
   * PICO spatial audio hardware feature. EXTENSION SEAM — referenced in
   * the PICO developer nav but the feature key is gated behind a JS-
   * rendered doc page. Best-known name pending confirmation.
   */
  SPATIAL_AUDIO: 'pico.hardware.spatialaudio',
  /**
   * PICO foveated rendering hardware feature. EXTENSION SEAM — key name
   * unconfirmed. Follows the `pico.hardware.*` pattern.
   */
  FOVEATION: 'pico.hardware.foveation',
  /**
   * PICO boundary / guardian system hardware feature. Corresponds to the
   * `XR_PICO_boundary_ext` OpenXR extension.
   * EXTENSION SEAM — Android feature key pending doc confirmation.
   */
  BOUNDARY: 'pico.hardware.boundary',
  /**
   * PICO scene mesh capability — distinct from `SCENE_UNDERSTANDING`
   * (planes-only). Emitted separately so consumers can declare mesh
   * support without the plane-only scene API. EXTENSION SEAM — key name
   * pending doc confirmation.
   */
  SCENE_MESH: 'pico.software.scenemesh',
} as const;

/**
 * PICO / Android permission strings relevant to hardware capabilities.
 * Split from `PICO_PROHIBITED_PERMISSIONS` (which lists permissions this
 * plugin *removes*) because these are permissions this plugin *adds*
 * when the corresponding capability option is enabled.
 */
export const PICO_PERMISSIONS = {
  /** Confirmed in PICO Unity Eye Tracking docs and the crx PICO wiki. */
  EYE_TRACKING: 'com.picovr.permission.EYE_TRACKING',
  /** Confirmed via the same sources as EYE_TRACKING. */
  FACE_TRACKING: 'com.picovr.permission.FACE_TRACKING',
  /**
   * EXTENSION SEAM — key name unconfirmed in open docs. Best-known
   * naming pattern. Usable today because permissions declared but not
   * recognized by PICO OS are silently ignored.
   */
  BODY_TRACKING: 'com.picovr.permission.BODY_TRACKING',
  /**
   * Standard AOSP permission. Required for any app that needs IMU /
   * accelerometer / gyroscope sampling above 200 Hz — typical for
   * immersive head-tracked VR.
   */
  HIGH_SAMPLING_RATE_SENSORS: 'android.permission.HIGH_SAMPLING_RATE_SENSORS',
  /**
   * PICO boundary / guardian permission. EXTENSION SEAM — name pending
   * doc confirmation; follows the `com.picovr.permission.*` pattern.
   */
  BOUNDARY: 'com.picovr.permission.BOUNDARY',
} as const;

export const DEVICE_TARGET_MAP: Record<string, string> = {
  'pico-4': 'PICO 4',
  'pico-4-ultra': 'PICO 4 Ultra',
  'neo3': 'PICO Neo3',
  'swan': 'PICO Swan',
} as const;

/** Target profile → manifest value */
export const TARGET_PROFILE_MAP: Record<string, string> = {
  'legacy': 'legacy',
  'pico4': 'pico4',
  'pico4ultra': 'pico4ultra',
  'swan': 'swan',
} as const;

/** Minimum SDK per target profile */
export const PROFILE_MIN_SDK: Record<string, number> = {
  legacy: 29,
  pico4: 32,
  pico4ultra: 32,
  swan: 33,
} as const;

export const PICO_PROHIBITED_PERMISSIONS = [
  'CALL_PHONE',
  'CALL_PRIVILEGED',
  'PROCESS_OUTGOING_CALLS',
  'READ_CALL_LOG',
  'WRITE_CALL_LOG',
  'READ_PHONE_STATE',
  'READ_PHONE_NUMBERS',
  'SEND_SMS',
  'RECEIVE_SMS',
  'READ_SMS',
  'RECEIVE_MMS',
  'RECEIVE_WAP_PUSH',
  'ADD_VOICEMAIL',
  'READ_VOICEMAIL',
  'WRITE_VOICEMAIL',
  'BIND_CARRIER_MESSAGING_SERVICE',
  'BIND_CARRIER_MESSAGING_CLIENT_SERVICE',
  'SMS_FINANCIAL_TRANSACTIONS',
  'SEND_RESPOND_VIA_MESSAGE',
  'ANSWER_PHONE_CALLS',
  'ACCEPT_HANDOVER',
  'MODIFY_PHONE_STATE',
] as const;
