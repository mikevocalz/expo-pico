package expo.modules.pico.spatial

/**
 * Phase K — Body tracking reflection bridge.
 *
 * Targets PICO Spatial SDK BodyTracker via reflection.
 *
 * SDK surface (best-known layout):
 *   com.picovr.spatial.sdk.tracking.BodyTracker
 *     .getBodyJoints() -> List<BodyJoint>  OR  BodyJoint[]
 *
 *   BodyJoint fields:
 *     String  name
 *     float[] position   (3 elements: x, y, z)
 *     float[] rotation   (4 elements: x, y, z, w  — quaternion)
 *
 * Returns null when the SDK is absent or tracking is unavailable.
 */
object BodyTrackingBridge {

    private val BODY_CLASS_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.tracking.BodyTracker",
        "com.pvr.spatial.sdk.tracking.BodyTracker",
    )

    private val GET_JOINTS_METHODS = arrayOf(
        "getBodyJoints",
        "getJoints",
        "getSkeletonJoints",
    )

    private val JOINT_NAME_FIELDS     = arrayOf("name", "jointName", "id")
    private val JOINT_POSITION_FIELDS = arrayOf("position", "mPosition", "pos")
    private val JOINT_ROTATION_FIELDS = arrayOf("rotation", "mRotation", "quat", "orientation")

    @Volatile private var bodyClass: Class<*>? = null
    @Volatile private var bodyInstance: Any? = null
    @Volatile private var probed = false
    @Volatile private var sdkAvailable = false

    fun isSdkAvailable(): Boolean {
        if (!probed) probe()
        return sdkAvailable
    }

    fun getBodyJoints(): List<Map<String, Any>>? {
        if (!isSdkAvailable()) return null
        return queryJoints()
    }

    private fun probe() {
        synchronized(this) {
            if (probed) return
            for (name in BODY_CLASS_CANDIDATES) {
                try {
                    val clazz = Class.forName(name, false, BodyTrackingBridge::class.java.classLoader)
                    bodyClass = clazz
                    sdkAvailable = true
                    break
                } catch (_: Throwable) { /* keep probing */ }
            }
            probed = true
        }
    }

    private fun getOrCreateInstance(): Any? {
        bodyInstance?.let { return it }
        val clazz = bodyClass ?: return null
        return try {
            val inst = clazz.getDeclaredConstructor().newInstance()
            bodyInstance = inst
            inst
        } catch (_: Throwable) { null }
    }

    private fun queryJoints(): List<Map<String, Any>>? {
        val clazz = bodyClass ?: return null
        return try {
            val inst = getOrCreateInstance() ?: return null
            for (methodName in GET_JOINTS_METHODS) {
                try {
                    val method = clazz.getMethod(methodName)
                    val result = method.invoke(inst) ?: continue
                    val joints: List<Any> = when (result) {
                        is List<*> -> @Suppress("UNCHECKED_CAST") (result as List<Any>)
                        is Array<*> -> @Suppress("UNCHECKED_CAST") (result as Array<Any>).toList()
                        else -> continue
                    }
                    if (joints.isEmpty()) return emptyList()
                    return joints.mapNotNull { joint -> parseJoint(joint) }
                } catch (_: Throwable) { /* try next method */ }
            }
            null
        } catch (_: Throwable) {
            null
        }
    }

    private fun parseJoint(joint: Any): Map<String, Any>? {
        return try {
            val jc = joint.javaClass
            val name = readStringField(joint, jc, JOINT_NAME_FIELDS) ?: "unknown"
            val position = readFloatArray(joint, jc, JOINT_POSITION_FIELDS) ?: FloatArray(3)
            val rotation = readFloatArray(joint, jc, JOINT_ROTATION_FIELDS) ?: FloatArray(4)
            mapOf(
                "name"     to name,
                "position" to listOf(
                    position.getOrElse(0) { 0f },
                    position.getOrElse(1) { 0f },
                    position.getOrElse(2) { 0f },
                ),
                "rotation" to listOf(
                    rotation.getOrElse(0) { 0f },
                    rotation.getOrElse(1) { 0f },
                    rotation.getOrElse(2) { 0f },
                    rotation.getOrElse(3) { 1f },
                ),
            )
        } catch (_: Throwable) { null }
    }

    private fun readStringField(obj: Any, clazz: Class<*>, names: Array<String>): String? {
        for (name in names) {
            try {
                val f = clazz.getDeclaredField(name)
                f.isAccessible = true
                val v = f.get(obj)
                if (v is String) return v
            } catch (_: Throwable) { /* try next */ }
        }
        return null
    }

    private fun readFloatArray(obj: Any, clazz: Class<*>, names: Array<String>): FloatArray? {
        for (name in names) {
            try {
                val f = clazz.getDeclaredField(name)
                f.isAccessible = true
                val v = f.get(obj)
                if (v is FloatArray) return v
            } catch (_: Throwable) { /* try next */ }
        }
        return null
    }

    internal fun resetForTesting() {
        synchronized(this) {
            bodyClass = null
            bodyInstance = null
            probed = false
            sdkAvailable = false
        }
    }
}
