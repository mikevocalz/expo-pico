package expo.modules.pico.spatial

/**
 * reflection-based probes for the PICO Spatial SDK.
 *
 * Mirrors the `PicoPlatformSdkDetector` pattern from expo-pico-core.
 * All probes swallow Throwable so partially-linked or absent AARs
 * never crash the host app.
 *
 * Spatial SDK class names are sourced from:
 *   https://developer.picoxr.com/document/spatial-sdk/
 *
 * Known candidate class layout (SDK 1.x):
 *   com.picovr.spatial.sdk.SpatialSDK                — top-level init
 *   com.picovr.spatial.sdk.anchor.SpatialAnchorManager
 *   com.picovr.spatial.sdk.mesh.MROManager           — scene/room mesh
 *   com.picovr.spatial.sdk.tracking.FaceTracker      — face blendshapes
 *   com.picovr.spatial.sdk.tracking.BodyTracker      — body joints
 *   com.picovr.spatial.sdk.tracking.EyeGazeProvider  — eye gaze
 *
 * A second candidate layout is provided for older public SDK releases
 * that shipped under a different package root (com.pvr.spatial.*).
 */
object PicoSpatialSdkDetector {

    private val SPATIAL_SDK_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.SpatialSDK",
        "com.pvr.spatial.sdk.SpatialSDK",
    )

    private val ANCHOR_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.anchor.SpatialAnchorManager",
        "com.pvr.spatial.sdk.anchor.SpatialAnchorManager",
    )

    private val MESH_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.mesh.MROManager",
        "com.pvr.spatial.sdk.mesh.MROManager",
        "com.picovr.spatial.sdk.mesh.SceneMeshManager",
    )

    private val FACE_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.tracking.FaceTracker",
        "com.pvr.spatial.sdk.tracking.FaceTracker",
    )

    private val BODY_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.tracking.BodyTracker",
        "com.pvr.spatial.sdk.tracking.BodyTracker",
    )

    private val EYE_GAZE_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.tracking.EyeGazeProvider",
        "com.pvr.spatial.sdk.tracking.EyeGazeProvider",
    )

    private val WINDOW_CONTAINER_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.window.WindowContainerManager",
        "com.pvr.spatial.sdk.window.WindowContainerManager",
    )

    private val SPACE_TRANSITION_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.space.SpaceTransitionManager",
        "com.pvr.spatial.sdk.space.SpaceTransitionManager",
    )

    private val VERSION_CLASS_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.BuildConfig",
        "com.pvr.spatial.sdk.BuildConfig",
    )

    private val VERSION_FIELD_CANDIDATES = arrayOf(
        "VERSION_NAME",
        "VERSION",
        "SDK_VERSION",
    )

    @JvmStatic
    fun isSpatialSdkPresent(): Boolean = probeAny(*SPATIAL_SDK_CANDIDATES)

    @JvmStatic
    fun isAnchorSdkPresent(): Boolean = probeAny(*ANCHOR_CANDIDATES)

    @JvmStatic
    fun isMeshSdkPresent(): Boolean = probeAny(*MESH_CANDIDATES)

    @JvmStatic
    fun isFaceSdkPresent(): Boolean = probeAny(*FACE_CANDIDATES)

    @JvmStatic
    fun isBodySdkPresent(): Boolean = probeAny(*BODY_CANDIDATES)

    @JvmStatic
    fun isEyeGazeSdkPresent(): Boolean = probeAny(*EYE_GAZE_CANDIDATES)

    @JvmStatic
    fun isWindowContainerSdkPresent(): Boolean = probeAny(*WINDOW_CONTAINER_CANDIDATES)

    @JvmStatic
    fun isSpaceTransitionSdkPresent(): Boolean = probeAny(*SPACE_TRANSITION_CANDIDATES)

    @JvmStatic
    fun findMeshClass(): Class<*>? = findClass(*MESH_CANDIDATES)

    @JvmStatic
    fun findAnchorClass(): Class<*>? = findClass(*ANCHOR_CANDIDATES)

    @JvmStatic
    fun findFaceClass(): Class<*>? = findClass(*FACE_CANDIDATES)

    @JvmStatic
    fun findBodyClass(): Class<*>? = findClass(*BODY_CANDIDATES)

    @JvmStatic
    fun findEyeGazeClass(): Class<*>? = findClass(*EYE_GAZE_CANDIDATES)

    @JvmStatic
    fun readSpatialSdkVersion(): String? {
        for (cls in VERSION_CLASS_CANDIDATES) {
            for (field in VERSION_FIELD_CANDIDATES) {
                val v = readStringField(cls, field)
                if (v != null) return v
            }
        }
        return null
    }

    @JvmStatic
    fun buildProbeReport(): Map<String, Boolean> = mapOf(
        "spatialSdk"        to isSpatialSdkPresent(),
        "anchors"           to isAnchorSdkPresent(),
        "mesh"              to isMeshSdkPresent(),
        "faceTracking"      to isFaceSdkPresent(),
        "bodyTracking"      to isBodySdkPresent(),
        "eyeGaze"           to isEyeGazeSdkPresent(),
        "windowContainer"   to isWindowContainerSdkPresent(),
        "spaceTransition"   to isSpaceTransitionSdkPresent(),
    )

    fun probeAny(vararg candidates: String): Boolean = findAvailable(*candidates) != null

    fun findAvailable(vararg candidates: String): String? {
        for (name in candidates) {
            try {
                Class.forName(name, false, PicoSpatialSdkDetector::class.java.classLoader)
                return name
            } catch (_: Throwable) {
                /* keep probing */
            }
        }
        return null
    }

    private fun findClass(vararg candidates: String): Class<*>? {
        for (name in candidates) {
            try {
                return Class.forName(name, true, PicoSpatialSdkDetector::class.java.classLoader)
            } catch (_: Throwable) {
                /* keep probing */
            }
        }
        return null
    }

    fun readStringField(className: String, fieldName: String): String? {
        return try {
            val clazz = Class.forName(className, false, PicoSpatialSdkDetector::class.java.classLoader)
            val field = clazz.getDeclaredField(fieldName)
            field.isAccessible = true
            (field.get(null) as? String)?.takeIf { it.isNotEmpty() }
        } catch (_: Throwable) {
            null
        }
    }
}
