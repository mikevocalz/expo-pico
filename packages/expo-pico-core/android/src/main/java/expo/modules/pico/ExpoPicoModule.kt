package expo.modules.pico

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.pico.os5.PicoOs5Runtime
import expo.modules.pico.swan.PicoSwanRuntime

class ExpoPicoModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoPico")

        Constants(
            "isPicoBuild" to Config.isPicoBuild,
            "isPicoDevice" to PicoDeviceUtils.isPicoDevice(),
            "spatialMode" to BuildConfig.PICO_SPATIAL_MODE.ifEmpty { "2d" },
            "targetProfile" to BuildConfig.PICO_TARGET_PROFILE.ifEmpty { "unknown" },
            "containerMode" to BuildConfig.PICO_CONTAINER_MODE.ifEmpty { "none" },
            "xrMode" to BuildConfig.PICO_XR_MODE.ifEmpty { "mobile" },
            "appType" to BuildConfig.PICO_APP_TYPE.ifEmpty { "2d" },
            "picoAppId" to BuildConfig.PICO_APP_ID.ifEmpty { null },
            "picoAppKey" to BuildConfig.PICO_APP_KEY.ifEmpty { null },
            "hasPlatformIdentity" to BuildConfig.PICO_HAS_PLATFORM_IDENTITY,
            "hasIapIdentity" to BuildConfig.PICO_HAS_IAP_IDENTITY,
            "picoOsVersion" to PicoDeviceUtils.getPicoOsVersion(),
            "deviceModel" to PicoDeviceUtils.getDeviceModel(),
            "emulatorOptimizations" to BuildConfig.PICO_EMULATOR_OPTIMIZATIONS,
            "swanRuntimeInitialized" to PicoSwanRuntime.isInitialized(),
            "os5RuntimeInitialized" to PicoOs5Runtime.isInitialized(),
            // Phase J — reflection-based Platform SDK detection. Both
            // values are evaluated once at module-init time (cheap — each
            // Class.forName with initialize=false only touches the
            // classloader) and cached by Expo Modules.
            "platformSdkPresent" to PicoPlatformSdkDetector.isAnyPlatformSdkPresent(),
            "platformSdkVersion" to PicoPlatformSdkDetector.readVersion(),
            // Phase K — capability declarations from the prebuild plugin
            // exposed at runtime so JS code can ask "did the prebuild
            // declare X?" without re-reading the manifest.
            // mapOf is explicitly typed Map<String, Any> because the
            // BuildConfig values are heterogeneous (Boolean for most
            // flags, String for PICO_NDK_ABI_FILTERS, etc.). Without the
            // annotation Kotlin can't unify the value types of the
            // Pair vararg and the whole block fails inference.
            "declaredCapabilities" to mapOf<String, Any>(
                "handTracking" to BuildConfig.PICO_HAND_TRACKING,
                "passthrough" to BuildConfig.PICO_PASSTHROUGH,
                "sceneUnderstanding" to BuildConfig.PICO_SCENE_UNDERSTANDING,
                "eyeTracking" to BuildConfig.PICO_EYE_TRACKING,
                "faceTracking" to BuildConfig.PICO_FACE_TRACKING,
                "bodyTracking" to BuildConfig.PICO_BODY_TRACKING,
                "spatialAudio" to BuildConfig.PICO_SPATIAL_AUDIO,
                "foveatedRendering" to BuildConfig.PICO_FOVEATED_RENDERING,
                "highSamplingRateSensors" to BuildConfig.PICO_HIGH_SAMPLING_RATE_SENSORS,
                "boundary" to BuildConfig.PICO_BOUNDARY,
                "sceneMesh" to BuildConfig.PICO_SCENE_MESH,
                "picoSenseController" to BuildConfig.PICO_SENSE_CONTROLLER,
                "motionTracker" to BuildConfig.PICO_MOTION_TRACKER,
                "controllerHaptics" to BuildConfig.PICO_CONTROLLER_HAPTICS,
                "openXrLoader" to BuildConfig.PICO_OPENXR_LOADER,
                "ndkAbiFilters" to BuildConfig.PICO_NDK_ABI_FILTERS,
                "developerTools" to BuildConfig.PICO_DEVELOPER_TOOLS,
                "entitlementCheck" to BuildConfig.PICO_ENTITLEMENT_CHECK,
            ),
            "declaredRefreshRates" to PicoCapabilityRuntime.getDeclaredRefreshRates(),
            "declaredTargetDevices" to PicoCapabilityRuntime.getDeclaredTargetDevices()
        )

        // Phase F runtime introspection + Phase J SDK probes. Async so
        // they don't block module init if the caller has many of them;
        // each hits PackageManager or the classloader.
        AsyncFunction("hasSystemFeature") { name: String ->
            val ctx = appContext.reactContext ?: return@AsyncFunction false
            PicoRuntimeCapabilities.hasSystemFeature(ctx, name)
        }

        AsyncFunction("getDeclaredFeatures") {
            val ctx = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any?>>()
            PicoRuntimeCapabilities.getDeclaredFeatures(ctx)
        }

        AsyncFunction("getDeclaredPermissions") {
            val ctx = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any?>>()
            PicoRuntimeCapabilities.getDeclaredPermissions(ctx)
        }

        AsyncFunction("getPlatformSdkProbe") {
            PicoPlatformSdkDetector.buildProbeReport()
        }

        // ── Phase K: per-capability runtime snapshot ────────────────

        AsyncFunction("getCapabilitySnapshot") {
            val ctx = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any?>>()
            PicoCapabilityRuntime.getCapabilitySnapshot(ctx)
        }

        AsyncFunction("isCapabilityAvailable") { name: String ->
            val ctx = appContext.reactContext ?: return@AsyncFunction null
            PicoCapabilityRuntime.isCapabilityAvailable(ctx, name)
        }

        // ── Phase K: XR display surfaces (refresh rate, foveation, passthrough)

        AsyncFunction("getCurrentRefreshRate") {
            PicoXrRuntime.getCurrentRefreshRate()
        }

        AsyncFunction("getSupportedRefreshRates") {
            PicoXrRuntime.getSupportedRefreshRates()
        }

        AsyncFunction("setRefreshRate") { hz: Float ->
            PicoXrRuntime.setRefreshRate(hz)
        }

        AsyncFunction("getFoveationLevel") {
            PicoXrRuntime.getFoveationLevel()
        }

        AsyncFunction("setFoveationLevel") { level: String ->
            PicoXrRuntime.setFoveationLevel(level)
        }

        AsyncFunction("setPassthroughEnabled") { enabled: Boolean ->
            PicoXrRuntime.setPassthroughEnabled(enabled)
        }

        AsyncFunction("isPassthroughActive") {
            PicoXrRuntime.isPassthroughActive()
        }

        // ── Phase K: tracking surfaces (eye, face, body, hand) ──────

        AsyncFunction("enableEyeTracking") {
            PicoTrackingRuntime.enableEyeTracking()
        }
        AsyncFunction("disableEyeTracking") {
            PicoTrackingRuntime.disableEyeTracking()
        }
        AsyncFunction("getEyePose") {
            PicoTrackingRuntime.getEyePose()
        }

        AsyncFunction("enableFaceTracking") {
            PicoTrackingRuntime.enableFaceTracking()
        }
        AsyncFunction("disableFaceTracking") {
            PicoTrackingRuntime.disableFaceTracking()
        }
        AsyncFunction("getFaceWeights") {
            PicoTrackingRuntime.getFaceWeights()
        }

        AsyncFunction("enableBodyTracking") {
            PicoTrackingRuntime.enableBodyTracking()
        }
        AsyncFunction("disableBodyTracking") {
            PicoTrackingRuntime.disableBodyTracking()
        }
        AsyncFunction("getBodyJoints") {
            PicoTrackingRuntime.getBodyJoints()
        }

        AsyncFunction("enableHandTracking") {
            PicoTrackingRuntime.enableHandTracking()
        }
        AsyncFunction("disableHandTracking") {
            PicoTrackingRuntime.disableHandTracking()
        }
        AsyncFunction("getHandPose") {
            PicoTrackingRuntime.getHandPose()
        }

        // ── Phase K: spatial surfaces (boundary, scene mesh, planes) ─

        AsyncFunction("isBoundaryVisible") {
            PicoSpatialRuntime.isBoundaryVisible()
        }
        AsyncFunction("setBoundaryVisible") { visible: Boolean ->
            PicoSpatialRuntime.setBoundaryVisible(visible)
        }
        AsyncFunction("getBoundaryGeometry") {
            PicoSpatialRuntime.getBoundaryGeometry()
        }
        AsyncFunction("refreshSceneMesh") {
            PicoSpatialRuntime.refreshSceneMesh()
        }
        AsyncFunction("getSceneMeshTriangleCount") {
            PicoSpatialRuntime.getSceneMeshTriangleCount()
        }
        AsyncFunction("getDetectedPlanes") {
            PicoSpatialRuntime.getDetectedPlanes()
        }
        AsyncFunction("refreshScene") {
            PicoSpatialRuntime.refreshScene()
        }

        // ── Phase K: controllers + haptics + Motion Tracker ─────────

        AsyncFunction("getControllers") {
            PicoControllerRuntime.getControllers()
        }
        AsyncFunction("triggerHaptic") { hand: String, amplitude: Float, durationMs: Int ->
            PicoControllerRuntime.triggerHaptic(hand, amplitude, durationMs)
        }
        AsyncFunction("getMotionTrackers") {
            PicoControllerRuntime.getMotionTrackers()
        }

        // ── Phase K: high-rate sensors ──────────────────────────────

        AsyncFunction("getHighRateSensors") {
            val ctx = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any?>>()
            PicoSensorRuntime.getHighRateSensors(ctx)
        }

        // ── Phase K: spatial audio ──────────────────────────────────

        AsyncFunction("isSpatialAudioEnabled") {
            PicoSpatialAudioRuntime.isSpatialAudioEnabled()
        }
        AsyncFunction("setSpatialAudioEnabled") { enabled: Boolean ->
            PicoSpatialAudioRuntime.setSpatialAudioEnabled(enabled)
        }
        AsyncFunction("getHrtfProfile") {
            PicoSpatialAudioRuntime.getHrtfProfile()
        }
    }
}
