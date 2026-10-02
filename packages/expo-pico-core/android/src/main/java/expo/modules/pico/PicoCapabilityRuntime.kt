package expo.modules.pico

import android.content.Context

/**
 * central registry mapping every prebuild capability flag to:
 *   1. its build-time declared state (BuildConfig field), and
 *   2. its runtime availability state (PackageManager.hasSystemFeature +
 *      PICO Platform SDK reflection probe + native library probe).
 *
 * Consumers can query a single `getCapabilitySnapshot()` or per-capability
 * `isCapabilityAvailable("eyeTracking")` and get a structured answer
 * without spelunking through nine different reflection paths.
 *
 * Three layers per capability:
 *
 *   declared        — was it flipped on at prebuild time?
 *                      (BuildConfig.PICO_<NAME>)
 *
 *   systemFeature   — does the device report it via PackageManager?
 *                      (PICO_FEATURES.* keys, e.g. pico.hardware.eyetracking)
 *
 *   sdkAvailable    — does PICO Platform SDK / PXR_Plugin / equivalent
 *                      runtime class resolve on the classpath via reflection?
 *
 * Why three layers: shipping native VR is a contract between the build,
 * the device, and an SDK. Any one missing produces a different failure mode
 * (manifest opt-in missing → installer ignores; device feature missing →
 * silently no-op at runtime; SDK class missing → caller sees null and falls
 * back). Surfacing all three lets diagnostics report exactly which step
 * broke.
 *
 * All probes are read-only and silent on failure. `getCapabilitySnapshot()`
 * is cheap enough to call from a diagnostics tab on every render — the
 * underlying primitives are simple PackageManager calls + cached
 * `Class.forName` lookups.
 */
internal object PicoCapabilityRuntime {

    /**
     * Capability registry. Each entry pairs a stable JS-facing name with:
     *   - the BuildConfig boolean read at module init,
     *   - the AndroidManifest `uses-feature` key (or `null` if no feature
     *     is declared, e.g. high-sampling-rate sensors which is a permission
     *     only),
     *   - the candidate PICO Platform SDK / PXR_Plugin class names that
     *     would need to resolve on the classpath for a runtime API to be
     *     usable.
     *
     * The SDK class candidates are best-known names — PICO renames classes
     * across SDK versions, so each entry takes a list and reports the first
     * hit. All swallow Throwable defensively (verifier failures, missing
     * native .so, NoClassDefFoundError, etc.).
     */
    private data class CapabilityDescriptor(
        val name: String,
        val declared: Boolean,
        val systemFeature: String?,
        val sdkClassCandidates: Array<String>,
    )

    private val REGISTRY: Array<CapabilityDescriptor> by lazy {
        arrayOf(
            CapabilityDescriptor(
                name = "handTracking",
                declared = BuildConfig.PICO_HAND_TRACKING,
                systemFeature = "pico.hardware.handtracking",
                sdkClassCandidates = arrayOf(
                    "com.picovr.handtracking.PXRHandTrackingApi",
                    "com.pvr.handtracking.HandTrackingApi",
                    "com.picoxr.tobsupport.handtracking.HandTracker",
                ),
            ),
            CapabilityDescriptor(
                name = "passthrough",
                declared = BuildConfig.PICO_PASSTHROUGH,
                systemFeature = "pico.hardware.passthrough",
                sdkClassCandidates = arrayOf(
                    "com.picovr.cvinterface.PXR_Plugin",
                    "com.pvr.passthrough.PassthroughApi",
                ),
            ),
            CapabilityDescriptor(
                name = "sceneUnderstanding",
                declared = BuildConfig.PICO_SCENE_UNDERSTANDING,
                systemFeature = "pico.software.scene",
                sdkClassCandidates = arrayOf(
                    "com.picovr.scene.PXRSceneApi",
                    "com.pvr.scene.SceneApi",
                ),
            ),
            CapabilityDescriptor(
                name = "eyeTracking",
                declared = BuildConfig.PICO_EYE_TRACKING,
                systemFeature = "pico.hardware.eyetracking",
                sdkClassCandidates = arrayOf(
                    "com.picovr.cvinterface.PXR_EyeTracking",
                    "com.pvr.eyetracking.EyeTrackingApi",
                    "com.picoxr.tobsupport.eyetracking.EyeTracker",
                ),
            ),
            CapabilityDescriptor(
                name = "faceTracking",
                declared = BuildConfig.PICO_FACE_TRACKING,
                systemFeature = "pico.hardware.facetracking",
                sdkClassCandidates = arrayOf(
                    "com.picovr.cvinterface.PXR_FaceTracking",
                    "com.pvr.facetracking.FaceTrackingApi",
                    "com.picoxr.tobsupport.facetracking.FaceTracker",
                ),
            ),
            CapabilityDescriptor(
                name = "bodyTracking",
                declared = BuildConfig.PICO_BODY_TRACKING,
                systemFeature = "pico.hardware.bodytracking",
                sdkClassCandidates = arrayOf(
                    "com.picovr.cvinterface.PXR_MotionTracker",
                    "com.pvr.bodytracking.BodyTrackingApi",
                ),
            ),
            CapabilityDescriptor(
                name = "spatialAudio",
                declared = BuildConfig.PICO_SPATIAL_AUDIO,
                systemFeature = "pico.hardware.spatialaudio",
                sdkClassCandidates = arrayOf(
                    "com.picovr.spatialaudio.SpatialAudioApi",
                    "com.pvr.spatialaudio.SpatialAudio",
                ),
            ),
            CapabilityDescriptor(
                name = "foveatedRendering",
                declared = BuildConfig.PICO_FOVEATED_RENDERING,
                systemFeature = "pico.hardware.foveation",
                sdkClassCandidates = arrayOf(
                    "com.picovr.cvinterface.PXR_Plugin",
                    "com.pvr.foveation.FoveationApi",
                ),
            ),
            CapabilityDescriptor(
                name = "highSamplingRateSensors",
                declared = BuildConfig.PICO_HIGH_SAMPLING_RATE_SENSORS,
                systemFeature = null,
                sdkClassCandidates = arrayOf("android.hardware.SensorManager"),
            ),
            CapabilityDescriptor(
                name = "boundary",
                declared = BuildConfig.PICO_BOUNDARY,
                systemFeature = "pico.hardware.boundary",
                sdkClassCandidates = arrayOf(
                    "com.picovr.cvinterface.PXR_Boundary",
                    "com.pvr.boundary.BoundaryApi",
                ),
            ),
            CapabilityDescriptor(
                name = "sceneMesh",
                declared = BuildConfig.PICO_SCENE_MESH,
                systemFeature = "pico.software.scenemesh",
                sdkClassCandidates = arrayOf(
                    "com.picovr.scene.PXRSceneMeshApi",
                    "com.pvr.scene.SceneMeshApi",
                ),
            ),
            CapabilityDescriptor(
                name = "picoSenseController",
                declared = BuildConfig.PICO_SENSE_CONTROLLER,
                systemFeature = "pico.hardware.controller",
                sdkClassCandidates = arrayOf(
                    "com.picovr.cvinterface.PXR_Plugin",
                    "com.pvr.controller.ControllerApi",
                ),
            ),
            CapabilityDescriptor(
                name = "motionTracker",
                declared = BuildConfig.PICO_MOTION_TRACKER,
                systemFeature = "pico.hardware.motiontracker",
                sdkClassCandidates = arrayOf(
                    "com.picovr.cvinterface.PXR_MotionTracker",
                    "com.pvr.motiontracker.MotionTrackerApi",
                ),
            ),
            CapabilityDescriptor(
                name = "controllerHaptics",
                declared = BuildConfig.PICO_CONTROLLER_HAPTICS,
                systemFeature = "pico.hardware.controller.haptic",
                sdkClassCandidates = arrayOf(
                    "com.picovr.cvinterface.PXR_Plugin",
                    "com.pvr.haptics.HapticsApi",
                ),
            ),
            CapabilityDescriptor(
                name = "openXrLoader",
                declared = BuildConfig.PICO_OPENXR_LOADER,
                systemFeature = null,
                sdkClassCandidates = arrayOf("org.khronos.openxr.OpenXR"),
            ),
            CapabilityDescriptor(
                name = "developerTools",
                declared = BuildConfig.PICO_DEVELOPER_TOOLS,
                systemFeature = null,
                sdkClassCandidates = arrayOf(),
            ),
            CapabilityDescriptor(
                name = "entitlementCheck",
                declared = BuildConfig.PICO_ENTITLEMENT_CHECK,
                systemFeature = null,
                sdkClassCandidates = arrayOf(
                    "com.pvr.platform.sdk.entitlement.EntitlementAPI",
                    "com.pvr.platform.sdk.PlatformSDK",
                ),
            ),
        )
    }

    /**
     * Per-capability snapshot: declared at build, available on device,
     * SDK class detected. Stable JSON shape — JS consumers destructure
     * directly.
     */
    fun getCapabilitySnapshot(context: Context): List<Map<String, Any?>> {
        return REGISTRY.map { entry ->
            val systemFeatureHit = entry.systemFeature?.let {
                PicoRuntimeCapabilities.hasSystemFeature(context, it)
            }
            val sdkHit = if (entry.sdkClassCandidates.isEmpty()) {
                null
            } else {
                PicoPlatformSdkDetector.findAvailable(*entry.sdkClassCandidates)
            }
            mapOf(
                "name" to entry.name,
                "declared" to entry.declared,
                "systemFeature" to entry.systemFeature,
                "systemFeatureAvailable" to systemFeatureHit,
                "sdkClassFound" to sdkHit,
                "sdkAvailable" to (sdkHit != null),
                "fullyAvailable" to (
                    entry.declared &&
                    (entry.systemFeature == null || systemFeatureHit == true) &&
                    (entry.sdkClassCandidates.isEmpty() || sdkHit != null)
                ),
            )
        }
    }

    /**
     * Quick boolean: is the named capability fully wired (declared at
     * build + present on device + SDK class loadable)? Returns null when
     * the capability name is unknown.
     */
    fun isCapabilityAvailable(context: Context, name: String): Boolean? {
        val entry = REGISTRY.firstOrNull { it.name == name } ?: return null
        if (!entry.declared) return false
        if (entry.systemFeature != null &&
            !PicoRuntimeCapabilities.hasSystemFeature(context, entry.systemFeature)
        ) return false
        if (entry.sdkClassCandidates.isNotEmpty() &&
            PicoPlatformSdkDetector.findAvailable(*entry.sdkClassCandidates) == null
        ) return false
        return true
    }

    /**
     * Build-time declared refresh rates parsed from
     * `BuildConfig.PICO_REFRESH_RATES`. Empty list when the consumer did
     * not declare any; the OS compositor will fall back to the device
     * default.
     */
    fun getDeclaredRefreshRates(): List<Int> {
        val raw = BuildConfig.PICO_REFRESH_RATES
        if (raw.isEmpty()) return emptyList()
        return raw.split(',')
            .mapNotNull { it.trim().toIntOrNull() }
            .filter { it > 0 }
    }

    /**
     * Build-time declared target device codenames parsed from
     * `BuildConfig.PICO_TARGET_DEVICES`. Empty list when no targetDevices
     * were declared; matches the unconstrained default.
     */
    fun getDeclaredTargetDevices(): List<String> {
        val raw = BuildConfig.PICO_TARGET_DEVICES
        if (raw.isEmpty()) return emptyList()
        return raw.split(',').map { it.trim() }.filter { it.isNotEmpty() }
    }
}
