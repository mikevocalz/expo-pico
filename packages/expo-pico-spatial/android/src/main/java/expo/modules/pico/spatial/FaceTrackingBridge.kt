package expo.modules.pico.spatial

/**
 * Phase K — Face tracking reflection bridge.
 *
 * Targets PICO Spatial SDK FaceTracker via reflection.
 *
 * SDK surface (best-known layout):
 *   com.picovr.spatial.sdk.tracking.FaceTracker
 *     .getBlendShapes() -> Map<String, Float>  OR  float[] with named indices
 *
 * Returns an empty map when the SDK is absent or tracking is unavailable.
 * Never crashes the host app.
 */
object FaceTrackingBridge {

    private val FACE_CLASS_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.tracking.FaceTracker",
        "com.pvr.spatial.sdk.tracking.FaceTracker",
    )

    private val GET_BLENDSHAPES_METHODS = arrayOf(
        "getBlendShapes",
        "getFaceBlendShapes",
        "getBlendshapeWeights",
    )

    @Volatile private var faceClass: Class<*>? = null
    @Volatile private var faceInstance: Any? = null
    @Volatile private var probed = false
    @Volatile private var sdkAvailable = false

    fun isSdkAvailable(): Boolean {
        if (!probed) probe()
        return sdkAvailable
    }

    fun getBlendShapes(): Map<String, Float>? {
        if (!isSdkAvailable()) return null
        return queryBlendShapes()
    }

    private fun probe() {
        synchronized(this) {
            if (probed) return
            for (name in FACE_CLASS_CANDIDATES) {
                try {
                    val clazz = Class.forName(name, false, FaceTrackingBridge::class.java.classLoader)
                    faceClass = clazz
                    sdkAvailable = true
                    break
                } catch (_: Throwable) { /* keep probing */ }
            }
            probed = true
        }
    }

    private fun getOrCreateInstance(): Any? {
        faceInstance?.let { return it }
        val clazz = faceClass ?: return null
        return try {
            val inst = clazz.getDeclaredConstructor().newInstance()
            faceInstance = inst
            inst
        } catch (_: Throwable) { null }
    }

    @Suppress("UNCHECKED_CAST")
    private fun queryBlendShapes(): Map<String, Float>? {
        val clazz = faceClass ?: return null
        return try {
            val inst = getOrCreateInstance() ?: return null
            for (methodName in GET_BLENDSHAPES_METHODS) {
                try {
                    val method = clazz.getMethod(methodName)
                    val result = method.invoke(inst) ?: continue
                    // SDK may return Map<String, Float> directly
                    if (result is Map<*, *>) {
                        @Suppress("UNCHECKED_CAST")
                        return (result as Map<String, Float>)
                    }
                    // Or a float[] with a companion getBlendShapeNames() method
                    if (result is FloatArray) {
                        val names = tryGetBlendShapeNames(clazz, inst)
                        if (names != null && names.size == result.size) {
                            return names.zip(result.toList()).toMap()
                        }
                        // Fallback: use index as key
                        return result.mapIndexed { i, v -> "blendShape_$i" to v }.toMap()
                    }
                } catch (_: Throwable) { /* try next method */ }
            }
            null
        } catch (_: Throwable) {
            null
        }
    }

    private fun tryGetBlendShapeNames(clazz: Class<*>, inst: Any): List<String>? = try {
        val m = clazz.getMethod("getBlendShapeNames")
        @Suppress("UNCHECKED_CAST")
        m.invoke(inst) as? List<String>
    } catch (_: Throwable) { null }

    internal fun resetForTesting() {
        synchronized(this) {
            faceClass = null
            faceInstance = null
            probed = false
            sdkAvailable = false
        }
    }
}
