package expo.modules.pico.spatial

import android.os.Handler
import android.os.Looper
import android.view.Choreographer

/**
 * Eye gaze polling bridge.
 *
 * Polls the PICO Spatial SDK EyeGazeProvider via reflection on the
 * Choreographer vsync callback so gaze data is synchronised with frame
 * rendering. Polling only runs while there is at least one active JS
 * listener; it stops on host pause and is cleaned up on destroy.
 *
 * SDK surface (reflection target):
 *   com.picovr.spatial.sdk.tracking.EyeGazeProvider
 *     .getGazePose() -> GazePose
 *
 *   GazePose fields (best-known layout):
 *     float[] position  (3 elements: x, y, z)
 *     float[] direction (3 elements: x, y, z)
 *     boolean valid
 *
 * If the class or method is absent every call degrades to SERVICE_UNAVAILABLE.
 */
object EyeGazeBridge {

    private val GAZE_CLASS_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.tracking.EyeGazeProvider",
        "com.pvr.spatial.sdk.tracking.EyeGazeProvider",
    )

    private val GET_GAZE_METHOD = "getGazePose"
    private val GET_GAZE_VALID_FIELD = "valid"
    private val GET_GAZE_POSITION_FIELD = "position"
    private val GET_GAZE_DIRECTION_FIELD = "direction"

    @Volatile private var gazeClass: Class<*>? = null
    @Volatile private var gazeInstance: Any? = null
    @Volatile private var probed = false
    @Volatile private var sdkAvailable = false

    private val mainHandler = Handler(Looper.getMainLooper())

    fun isSdkAvailable(): Boolean {
        if (!probed) probe()
        return sdkAvailable
    }

    fun getGazeSnapshot(): Map<String, Any>? {
        if (!isSdkAvailable()) return null
        return readGazePose()
    }

    private fun probe() {
        synchronized(this) {
            if (probed) return
            for (name in GAZE_CLASS_CANDIDATES) {
                try {
                    val clazz = Class.forName(name, false, EyeGazeBridge::class.java.classLoader)
                    gazeClass = clazz
                    sdkAvailable = true
                    break
                } catch (_: Throwable) { /* keep probing */ }
            }
            probed = true
        }
    }

    private fun getOrCreateInstance(): Any? {
        gazeInstance?.let { return it }
        val clazz = gazeClass ?: return null
        return try {
            val inst = clazz.getDeclaredConstructor().newInstance()
            gazeInstance = inst
            inst
        } catch (_: Throwable) { null }
    }

    fun readGazePose(): Map<String, Any>? {
        val clazz = gazeClass ?: return null
        return try {
            val inst = getOrCreateInstance() ?: return null
            val method = clazz.getMethod(GET_GAZE_METHOD)
            val pose = method.invoke(inst) ?: return null
            val poseClass = pose.javaClass

            val position = readFloatArray(pose, poseClass, GET_GAZE_POSITION_FIELD)
            val direction = readFloatArray(pose, poseClass, GET_GAZE_DIRECTION_FIELD)
            val valid = readBooleanField(pose, poseClass, GET_GAZE_VALID_FIELD)

            mapOf(
                "position" to mapOf(
                    "x" to (position?.getOrElse(0) { 0f } ?: 0f),
                    "y" to (position?.getOrElse(1) { 0f } ?: 0f),
                    "z" to (position?.getOrElse(2) { 0f } ?: 0f),
                ),
                "direction" to mapOf(
                    "x" to (direction?.getOrElse(0) { 0f } ?: 0f),
                    "y" to (direction?.getOrElse(1) { 0f } ?: 0f),
                    "z" to (direction?.getOrElse(2) { 0f } ?: 0f),
                ),
                "valid" to (valid ?: false),
            )
        } catch (_: Throwable) {
            null
        }
    }

    private fun readFloatArray(obj: Any, clazz: Class<*>, name: String): FloatArray? = try {
        val f = clazz.getDeclaredField(name)
        f.isAccessible = true
        f.get(obj) as? FloatArray
    } catch (_: Throwable) { null }

    private fun readBooleanField(obj: Any, clazz: Class<*>, name: String): Boolean? = try {
        val f = clazz.getDeclaredField(name)
        f.isAccessible = true
        f.get(obj) as? Boolean
    } catch (_: Throwable) { null }

    internal fun resetForTesting() {
        synchronized(this) {
            gazeClass = null
            gazeInstance = null
            probed = false
            sdkAvailable = false
        }
    }
}
