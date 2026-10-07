import type { PicoPlatformServiceName } from './ppsArtifacts';
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
     * - 'mobile': No PICO runtime. Core still autolinks and reports
     *   `xrMode: 'mobile'` from BuildConfig.
     * - 'pico-os5': Standard PICO OS 6 runtime registration. Default for
     *   `buildVariant: 'pico'` and `'dual'`.
     * - 'pico-swan': Project Swan / next-gen spatial runtime. Adds Swan-only
     *   manifest meta-data, an optional Swan SDK Maven dependency, an optional
     *   Swan runtime Gradle subproject inclusion via settings.gradle, and
     *   sets BuildConfig.PICO_XR_MODE to 'pico-swan'.
     *
     * @default 'pico-os5' when buildVariant is 'pico' or 'dual', otherwise 'mobile'
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
     *   - `xrMode: 'pico-os5'`      → `appType: 'vr'`
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
    /**
     * Default panel width for the 2D MainActivity when running as a
     * window-container in the immersive environment. Mirrors expo-horizon-core's
     * `defaultWidth`. Emits `<layout android:defaultWidth="…"/>` on MainActivity.
     * Value is a dp string (e.g. `"1024dp"`).
     * @default Not added
     */
    defaultWidth?: string;
    /**
     * Default panel height for the 2D MainActivity when running as a
     * window-container in the immersive environment. Mirrors expo-horizon-core's
     * `defaultHeight`. Emits `<layout android:defaultHeight="…"/>` on MainActivity.
     * Value is a dp string (e.g. `"640dp"`).
     * @default Not added
     */
    defaultHeight?: string;
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
     * Declare PICO boundary / guardian support (corresponds to the
     * `XR_PICO_boundary_ext` OpenXR extension). Emits
     * `uses-feature pico.hardware.boundary` plus
     * `com.picovr.permission.BOUNDARY`. EXTENSION SEAM — names pending
     * doc confirmation.
     * @default false
     */
    boundary?: boolean;
    /**
     * Declare PICO scene mesh support — distinct from the plane-only
     * `sceneUnderstanding` option. Emits
     * `uses-feature pico.software.scenemesh`. EXTENSION SEAM — key name
     * pending doc confirmation.
     * @default false
     */
    sceneMesh?: boolean;
    /**
     * Declare PICO Sense / 6DoF controller input support. Emits
     * `uses-feature pico.hardware.controller` +
     * `com.picovr.permission.CONTROLLER`.
     * EXTENSION SEAM — both key names are best-known naming patterns,
     * not yet confirmed in open PICO developer docs. Device validation
     * is required before shipping this to production — see
     * `docs/DEVICE-TESTING-REQUIRED.md`. Emitted with
     * `android:required="false"` so install-time damage on a misname is
     * zero (unrecognized features are ignored by the installer).
     * @default false
     */
    picoSenseController?: boolean;
    /**
     * Declare PICO Motion Tracker companion-device support. Emits
     * `uses-feature pico.hardware.motiontracker` +
     * `com.picovr.permission.MOTION_TRACKER`.
     * EXTENSION SEAM — the Motion Tracker dongle may additionally
     * require `android.permission.USB_HOST`. Consumers who enable this
     * option should verify the full dongle flow on real hardware; see
     * `docs/DEVICE-TESTING-REQUIRED.md`.
     * @default false
     */
    motionTracker?: boolean;
    /**
     * Declare PICO controller haptic-feedback support. Emits
     * `uses-feature pico.hardware.controller.haptic`.
     * EXTENSION SEAM — no paired permission is known; the feature key
     * is emitted opt-in so apps that don't use haptics don't declare
     * hardware they don't drive.
     * @default false
     */
    controllerHaptics?: boolean;
    /**
     * Restrict the `pico` (and `dual`) product flavor(s) to `arm64-v8a`
     * via `ndk { abiFilters 'arm64-v8a' }`. PICO 4 / 4 Ultra / Swan are
     * all 64-bit ARM; shipping 32-bit or x86 slices is wasted APK bloat
     * for zero install coverage. The `mobile` flavor is always left
     * unconstrained so phone/tablet builds pick up whatever ABIs the
     * app already declares.
     *
     * Compatible with `@reactvision/react-viro` (requires arm64-v8a on
     * PICO / Quest) and Unity-as-a-Library — the filter is a build-output
     * concern, not a runtime rendering choice.
     *
     * Set to `false` if your CI pipeline depends on producing a 32-bit
     * slice for another purpose and you accept the larger PICO APK.
     * @default true when xrMode !== 'mobile', false otherwise
     */
    ndkAbiFilters?: boolean;
    /**
     * Emit `<uses-native-library android:name="libopenxr_loader.so"
     * android:required="false"/>` in the PICO-flavor manifest. Required
     * for `targetSdkVersion >= 31` so `System.loadLibrary("openxr_loader")`
     * succeeds at runtime — the Khronos-conformant OpenXR loader used by
     * `@reactvision/react-viro` and by the PICO Native SDK hits this
     * requirement.
     *
     * Opt this to `false` if your renderer bundles its own OpenXR loader
     * and does NOT go through the system loader (rare — Viro and Unity
     * both use the system loader). Setting to `true` when
     * `xrMode === 'mobile'` has no observable effect on mobile builds
     * but also no harm; defaults track xrMode to keep mobile builds
     * minimal.
     * @default true when xrMode !== 'mobile', false otherwise
     */
    openXrLoaderDeclaration?: boolean;
    /**
     * Overlay a PICO-capable `libviro_renderer.so` over the one
     * `@reactvision/react-viro` ships.
     *
     * The bundled build comes from the mikevocalz/virocore fork's `main`
     * (`d9b833d8`, CI artifact `viro_renderer-release-aar`). Over stock 3.0.2 it:
     *   - defaults PICO to a floor origin (`LOCAL_FLOOR`, else STAGE-emulated),
     *     so y=0 is the real floor instead of eye level, where scenes authored for
     *     a floor sit at waist height;
     *   - binds `/interaction_profiles/bytedance/pico4_controller` alongside
     *     Oculus Touch;
     *   - routes controller B / Menu to `Activity.onBackPressed()`, so React
     *     Native's BackHandler sees it in VRActivity.
     *
     * Its JNI surface is a strict superset of stock 3.0.2's (only added
     * natives), so it loads against the stock Java classes. An older overlay
     * built before 3.0 aborted in `VROPlatformRunTask` on XR entry; if the Viro
     * pin moves, rebuild this from the fork and re-check the native diff.
     *
     * Staged into the `pico`, `dual` and `quest` flavors, never `main` or
     * `mobile`. Quest gets the same floor origin and controller mesh.
     *
     * arm64-v8a only — PICO ships no 32-bit device. Defaults to `false`: it
     * replaces a renderer the app did not ask this package to touch, so it is
     * opt-in.
     */
    viroRendererOverlay?: boolean;
    /**
     * Use the bundled legacy OpenXR loader override in PICO flavors only.
     * Set false when consuming a rebuilt ViroCore AAR with a verified loader.
     * This is separate from declaring the OpenXR runtime in the manifest.
     * @default true for immersive PICO builds; false for mobile builds
     */
    openXrLoaderOverlay?: boolean;
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
     * Which `com.pico.pps:platform-service-*` artifacts to put on the
     * classpath.
     *
     * Leave this unset and the plugin derives the set from the
     * `@expo-pico/*` packages installed in the app, de-duplicated — two
     * packages that share a service produce one declaration. Set it to
     * reach a service no package wraps yet (`compliance`, `entitlement`,
     * `sport`, `speech`) or to trim the set by hand.
     *
     * The artifacts are declared once, in the app module. No sibling
     * package declares a `com.pico.pps` coordinate of its own.
     */
    services?: PicoPlatformServiceName[];
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
export type PicoXRMode = 'mobile' | 'pico-os5' | 'pico-swan';
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
/**
 * Spatial rendering mode. Drives the `com.pico.spatial.mode` meta-data.
 *
 *   - `2d`:           Standard flat Android rendering.
 *   - `windowed`:     WindowContainer in Shared Space.
 *   - `shared-space`: App runs in PICO OS Shared Space (multi-app layer).
 *   - `full-space`:   App takes over the full spatial environment.
 *   - `immersive`:    Legacy full-immersive mode (pre-OS6).
 *   - `volume`:       PICO OS 6 3D Volume container (analogous to
 *                     visionOS Volume) — EXTENSION SEAM, name pending
 *                     PICO doc confirmation.
 */
export type PicoSpatialMode = '2d' | 'windowed' | 'shared-space' | 'full-space' | 'immersive' | 'volume';
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
    /**
     * Explicit service list, or `null` to derive it from the installed
     * `@expo-pico/*` packages at prebuild time.
     */
    services: PicoPlatformServiceName[] | null;
    /** Derived: true iff at least one identity field is non-null. */
    hasIdentity: boolean;
    /** Derived: true iff both `picoMerchantId` and `picoPayKey` are non-null. */
    hasIapIdentity: boolean;
}
export interface ResolvedPicoSwanOptions {
    swanRuntimeProject: {
        name: string;
        path: string;
    } | null;
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
    defaultWidth: string | null;
    defaultHeight: string | null;
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
    boundary: boolean;
    sceneMesh: boolean;
    picoSenseController: boolean;
    motionTracker: boolean;
    controllerHaptics: boolean;
    ndkAbiFilters: boolean;
    openXrLoaderDeclaration: boolean;
    viroRendererOverlay: boolean;
    openXrLoaderOverlay: boolean;
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
export declare const PICO_PLATFORM_SERVICE_DEFAULTS: ResolvedPicoPlatformServiceOptions;
export declare const PICO_SWAN_DEFAULTS: ResolvedPicoSwanOptions;
export declare const PICO_OPTION_DEFAULTS: ResolvedPicoOptions;
export declare function resolveOptions(options?: PicoPluginOptions): ResolvedPicoOptions;
/**
 * Resolve the effective target profile from options.
 * When 'auto', infer from targetDevices, then from xrMode.
 */
export declare function resolveTargetProfile(options: ResolvedPicoOptions): Exclude<PicoTargetProfile, 'auto'>;
/**
 * Map the plugin-facing xrMode string to the native PicoXRPlatform enum
 * value rendered into MainApplication and BuildConfig.
 */
export declare function xrModeToNativeEnum(mode: PicoXRMode): 'MOBILE' | 'PICO_OS5' | 'PICO_SWAN';
//# sourceMappingURL=types.d.ts.map