export declare const PICO_MAVEN_REPO = "https://developer.pico-interactive.com/maven";
export declare const PICO_SDK_GROUP = "com.pvr";
export declare const PICO_PLATFORM_SDK_GROUP = "com.pvr.platform";
export declare const PICO_PLATFORM_SDK_VERSION = "3.2.0";
export declare const PICO_SPATIAL_SDK_VERSION = "1.0.0";
export declare const MANIFEST_META: {
    readonly PICO_APP_ID: "pvr.app.id";
    /**
     * Launcher contract meta-data. Read by the PICO OS 6 launcher to decide
     * how to enumerate the APK (immersive VR, mixed reality, or 2D fallback).
     * Source: PICO OpenXR Mobile SDK, Chapter 4.
     *   sdk.picovr.com/docs/OpenXRMobileSDKv2/en/chapter_four.html
     * Lives at <application> scope.
     */
    readonly PVR_APP_TYPE: "pvr.app.type";
    readonly SUPPORTED_DEVICES: "com.pico.supportedDevices";
    /**
     * NOTE: Provisional / spatial-runtime metadata, NOT the launcher contract.
     * The launcher contract for immersive enumeration is the combination of
     * `pvr.app.type` (above) plus the OpenXR + PICO launcher-activity
     * categories declared by withPicoLauncherActivity. Do not conflate the
     * two: removing `com.pico.spatial.mode` would not affect immersive
     * enumeration; removing `pvr.app.type` or the launcher categories
     * would.
     */
    readonly SPATIAL_MODE: "com.pico.spatial.mode";
    readonly CONTAINER_MODE: "com.pico.spatial.containerMode";
    readonly TARGET_PROFILE: "com.pico.targetProfile";
    readonly XR_MODE: "com.pico.xrMode";
    readonly ENTITLEMENT_CHECK: "pvr.app.entitlement.check";
    readonly DEVELOPER_TOOLS: "com.pico.developerTools";
    readonly SWAN_SPATIAL_CONTAINER: "com.pico.swan.spatialContainer";
    readonly SWAN_RUNTIME_VERSION: "com.pico.swan.runtimeVersion";
    /**
     * Supported display refresh rates in Hz, comma-separated. Read by
     * the PICO OS compositor at boot to decide which refresh-rate target
     * to offer the app. EXTENSION SEAM — the exact meta-data key is not
     * confirmed in open PICO docs. Best-known key; emitted only when the
     * consumer explicitly populates `refreshRates`.
     */
    readonly REFRESH_RATES: "com.pico.refreshRates";
    /**
     * Foveated rendering opt-in. Value is `"true"` when enabled.
     * EXTENSION SEAM — key name unconfirmed. Emitted only when the
     * consumer explicitly enables `foveatedRendering`.
     */
    readonly FOVEATION_ENABLED: "com.pico.foveation.enabled";
};
/**
 * Plugin-facing `appType` value → manifest meta-data value rendered into
 * `pvr.app.type`. Confirmed values from PICO OpenXR Mobile SDK Ch. 4.
 */
export declare const APP_TYPE_MANIFEST_VALUE: Record<string, string>;
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
export declare const LAUNCHER_CATEGORIES: {
    readonly OPENXR_IMMERSIVE_HMD: "org.khronos.openxr.intent.category.IMMERSIVE_HMD";
    readonly PICO_VR: "com.pico.intent.category.VR";
    readonly PICOVR_VR_LEGACY: "com.picovr.intent.category.VR";
};
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
export declare const PICO_QUERY_PACKAGES: readonly ["com.pico.os.systemui", "com.pico.platform"];
/**
 * Plugin-facing xrMode string → manifest meta-data value rendered into
 * `com.pico.xrMode`. The native PicoXRPlatform enum reads this at boot via
 * BuildConfig.PICO_XR_MODE; the manifest copy lets PICO OS launchers and
 * entitlement checks inspect it without instantiating the app.
 */
export declare const XR_MODE_MANIFEST_VALUE: Record<string, string>;
/**
 * Marker used by the MainApplication mod for idempotent insertion. When
 * present in the file the mod is a no-op. The value is part of the
 * inserted block so dedupe works on a re-run with the same xrMode.
 */
export declare const PICO_MAIN_APP_MARKER = "// expo-pico-core: PicoCorePackage registration";
export declare const PICO_MAIN_APP_IMPORT_MARKER = "// expo-pico-core: PicoCorePackage import";
export declare const PICO_MAIN_APP_FLAGS_MARKER = "// expo-pico-core: New Architecture flag guard for the Viro VR activity hop";
export declare const PICO_MAIN_APP_FLAGS_IMPORT_MARKER = "// expo-pico-core: New Architecture flag guard imports";
export declare const PICO_SETTINGS_MARKER = "// expo-pico-core: pico subprojects";
export declare const PICO_FEATURES: {
    readonly HAND_TRACKING: "pico.hardware.handtracking";
    readonly PASSTHROUGH: "pico.hardware.passthrough";
    readonly SCENE_UNDERSTANDING: "pico.software.scene";
    readonly VR_HEADTRACKING: "android.hardware.vr.headtracking";
    readonly SPATIAL_ANCHOR: "pico.software.spatialanchor";
    /**
     * PICO 4 Pro / 4 Ultra / Enterprise eye-tracking hardware feature.
     * Follows the `pico.hardware.*` naming pattern used by the
     * hand-tracking and passthrough declarations confirmed in the PICO
     * sample manifests.
     */
    readonly EYE_TRACKING: "pico.hardware.eyetracking";
    /**
     * PICO 4 Pro / Enterprise face-tracking hardware feature (upper +
     * lower face). Confirmed in PICO Unity face-tracking docs; Android
     * feature key follows the `pico.hardware.*` pattern.
     */
    readonly FACE_TRACKING: "pico.hardware.facetracking";
    /**
     * PICO Motion Tracker body-tracking feature. EXTENSION SEAM — the
     * feature key is not confirmed in open PICO docs as of this writing.
     * When PICO publishes the canonical name, update this constant.
     */
    readonly BODY_TRACKING: "pico.hardware.bodytracking";
    /**
     * PICO spatial audio hardware feature. EXTENSION SEAM — referenced in
     * the PICO developer nav but the feature key is gated behind a JS-
     * rendered doc page. Best-known name pending confirmation.
     */
    readonly SPATIAL_AUDIO: "pico.hardware.spatialaudio";
    /**
     * PICO foveated rendering hardware feature. EXTENSION SEAM — key name
     * unconfirmed. Follows the `pico.hardware.*` pattern.
     */
    readonly FOVEATION: "pico.hardware.foveation";
    /**
     * PICO boundary / guardian system hardware feature. Corresponds to the
     * `XR_PICO_boundary_ext` OpenXR extension.
     * EXTENSION SEAM — Android feature key pending doc confirmation.
     */
    readonly BOUNDARY: "pico.hardware.boundary";
    /**
     * PICO scene mesh capability — distinct from `SCENE_UNDERSTANDING`
     * (planes-only). Emitted separately so consumers can declare mesh
     * support without the plane-only scene API. EXTENSION SEAM — key name
     * pending doc confirmation.
     */
    readonly SCENE_MESH: "pico.software.scenemesh";
    /**
     * PICO Sense / 6DoF controller hardware. EXTENSION SEAM — the feature
     * key is the best-known naming pattern (`pico.hardware.controller`)
     * but is not confirmed in open PICO developer documentation as of
     * this writing. See `docs/DEVICE-TESTING-REQUIRED.md` for the
     * validation list.
     */
    readonly CONTROLLER: "pico.hardware.controller";
    /**
     * PICO Motion Tracker accessory (waist / foot trackers sold as
     * peripherals). EXTENSION SEAM — both the feature key and its
     * USB-host coupling are unconfirmed; shipped opt-in with
     * `android:required="false"` so mis-named declarations are install
     * safe.
     */
    readonly CONTROLLER_MOTION_TRACKER: "pico.hardware.motiontracker";
    /**
     * PICO controller haptic-feedback capability. EXTENSION SEAM — apps
     * using controller haptics declare this so the PICO OS can gate
     * low-latency actuator access. Name pending doc confirmation.
     */
    readonly CONTROLLER_HAPTIC: "pico.hardware.controller.haptic";
};
/**
 * PICO / Android permission strings relevant to hardware capabilities.
 * Split from `PICO_PROHIBITED_PERMISSIONS` (which lists permissions this
 * plugin *removes*) because these are permissions this plugin *adds*
 * when the corresponding capability option is enabled.
 */
export declare const PICO_PERMISSIONS: {
    /** Confirmed in PICO Unity Eye Tracking docs and the crx PICO wiki. */
    readonly EYE_TRACKING: "com.picovr.permission.EYE_TRACKING";
    /** Confirmed via the same sources as EYE_TRACKING. */
    readonly FACE_TRACKING: "com.picovr.permission.FACE_TRACKING";
    /**
     * EXTENSION SEAM — key name unconfirmed in open docs. Best-known
     * naming pattern. Usable today because permissions declared but not
     * recognized by PICO OS are silently ignored.
     */
    readonly BODY_TRACKING: "com.picovr.permission.BODY_TRACKING";
    /**
     * Standard AOSP permission. Required for any app that needs IMU /
     * accelerometer / gyroscope sampling above 200 Hz — typical for
     * immersive head-tracked VR.
     */
    readonly HIGH_SAMPLING_RATE_SENSORS: "android.permission.HIGH_SAMPLING_RATE_SENSORS";
    /**
     * PICO boundary / guardian permission. EXTENSION SEAM — name pending
     * doc confirmation; follows the `com.picovr.permission.*` pattern.
     */
    readonly BOUNDARY: "com.picovr.permission.BOUNDARY";
    /**
     * PICO Sense / 6DoF controller input permission. EXTENSION SEAM —
     * the permission key is not confirmed in open PICO docs as of this
     * writing. Mis-named permissions are silently ignored by the
     * installer, so shipping this seam today is install-safe.
     */
    readonly CONTROLLER: "com.picovr.permission.CONTROLLER";
    /**
     * PICO Motion Tracker companion device permission. EXTENSION SEAM —
     * the Motion Tracker dongle may also require
     * `android.permission.USB_HOST`; consumers enabling
     * `motionTracker: true` should verify both on their target device.
     */
    readonly MOTION_TRACKER: "com.picovr.permission.MOTION_TRACKER";
};
export declare const DEVICE_TARGET_MAP: Record<string, string>;
/** Target profile → manifest value */
export declare const TARGET_PROFILE_MAP: Record<string, string>;
/** Minimum SDK per target profile */
export declare const PROFILE_MIN_SDK: Record<string, number>;
export declare const PICO_PROHIBITED_PERMISSIONS: readonly ["CALL_PHONE", "CALL_PRIVILEGED", "PROCESS_OUTGOING_CALLS", "READ_CALL_LOG", "WRITE_CALL_LOG", "READ_PHONE_STATE", "READ_PHONE_NUMBERS", "SEND_SMS", "RECEIVE_SMS", "READ_SMS", "RECEIVE_MMS", "RECEIVE_WAP_PUSH", "ADD_VOICEMAIL", "READ_VOICEMAIL", "WRITE_VOICEMAIL", "BIND_CARRIER_MESSAGING_SERVICE", "BIND_CARRIER_MESSAGING_CLIENT_SERVICE", "SMS_FINANCIAL_TRANSACTIONS", "SEND_RESPOND_VIA_MESSAGE", "ANSWER_PHONE_CALLS", "ACCEPT_HANDOVER", "MODIFY_PHONE_STATE"];
/**
 * Native libraries declared via `<uses-native-library>` in the PICO-flavor
 * manifest. Required once `targetSdkVersion >= 31` per AOSP: apps that
 * link against any non-Bionic native library must declare it, or
 * `System.loadLibrary` calls fail at runtime.
 *
 * `libopenxr_loader.so` is the PICO OS OpenXR loader that any OpenXR
 * app binds to at init. Declaring it with `android:required="false"`
 * keeps the APK installable on non-PICO Android targets where the
 * loader is absent — the app must still guard `loadLibrary` with a
 * try/catch at runtime (standard PICO + Quest pattern).
 */
export declare const PICO_NATIVE_LIBRARIES: readonly [{
    readonly name: "libopenxr_loader.so";
    readonly required: false;
    readonly purpose: "OpenXR loader — required for PICO OS immersive session bootstrap.";
}];
/**
 * ABI filter applied to the `pico` product flavor.
 *
 * PICO 4 / 4 Ultra / Swan are all 64-bit ARM. Shipping `armeabi-v7a`
 * wastes ~30% APK size for zero install coverage (no 32-bit PICO
 * hardware exists) and x86 is not supported at all. The `mobile`
 * flavor deliberately does NOT get this filter so developers can
 * still target phones/tablets across the full ABI matrix.
 */
export declare const PICO_FLAVOR_ABI_FILTERS: readonly string[];
//# sourceMappingURL=constants.d.ts.map