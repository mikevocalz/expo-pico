package expo.modules.pico.spatial

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Phase K — PICO spatial runtime Expo Module.
 *
 * Wires createSpatialAnchor, setWindowContainerProperties, and
 * requestFullSpace to the PICO Spatial SDK via reflection. All calls
 * reject with SERVICE_UNAVAILABLE when the Spatial SDK AAR is absent
 * rather than crashing or silently no-opping.
 *
 * @see https://developer.picoxr.com/document/spatial-sdk/
 */
class ExpoPicoSpatialModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoPicoSpatial")

        Constants(
            "spaceState" to SpatialDeviceUtils.detectSpaceState(),
            "containerType" to SpatialDeviceUtils.detectContainerType(),
            "spatialSdkVersion" to (PicoSpatialSdkDetector.readSpatialSdkVersion()
                ?: SpatialDeviceUtils.getSpatialSdkVersion()),
            "capabilities" to mapOf(
                "spaceStates"        to SpatialDeviceUtils.supportsSpaceStates(),
                "spatialAnchors"     to SpatialDeviceUtils.supportsSpatialAnchors(),
                "sceneUnderstanding" to SpatialDeviceUtils.supportsSceneUnderstanding(),
                "passthrough"        to SpatialDeviceUtils.supportsPassthrough(),
                "handTracking"       to SpatialDeviceUtils.supportsHandTracking(),
                "spatialSdkAvailable" to PicoSpatialSdkDetector.isSpatialSdkPresent(),
            )
        )

        AsyncFunction("getSpatialSdkProbe") {
            PicoSpatialSdkDetector.buildProbeReport()
        }

        AsyncFunction("createSpatialAnchor") { pose: Map<String, Any> ->
            if (!PicoSpatialSdkDetector.isAnchorSdkPresent()) {
                throw SpatialServiceUnavailableException(
                    "PICO Spatial SDK anchor support not available. " +
                    "Ensure pico-spatial-sdk.aar is in vendor/pico-sdk/ and the device supports spatial anchors."
                )
            }
            val position = pose["position"] as? Map<*, *>
                ?: throw SpatialValidationException("pose.position is required and must be {x, y, z}")
            val orientation = pose["orientation"] as? Map<*, *>
                ?: throw SpatialValidationException("pose.orientation is required and must be {x, y, z, w}")

            val px = (position["x"] as? Number)?.toFloat() ?: 0f
            val py = (position["y"] as? Number)?.toFloat() ?: 0f
            val pz = (position["z"] as? Number)?.toFloat() ?: 0f
            val ox = (orientation["x"] as? Number)?.toFloat() ?: 0f
            val oy = (orientation["y"] as? Number)?.toFloat() ?: 0f
            val oz = (orientation["z"] as? Number)?.toFloat() ?: 0f
            val ow = (orientation["w"] as? Number)?.toFloat() ?: 1f

            SpatialAnchorBridge.createAnchor(px, py, pz, ox, oy, oz, ow)
        }

        AsyncFunction("setWindowContainerProperties") { props: Map<String, Any> ->
            if (!PicoSpatialSdkDetector.isWindowContainerSdkPresent()) {
                throw SpatialServiceUnavailableException(
                    "PICO Spatial SDK WindowContainer support not available. " +
                    "Ensure pico-spatial-sdk.aar is in vendor/pico-sdk/ and you are running on PICO OS 6+."
                )
            }
            WindowContainerBridge.setProperties(props)
        }

        AsyncFunction("requestFullSpace") {
            if (!PicoSpatialSdkDetector.isSpaceTransitionSdkPresent()) {
                throw SpatialServiceUnavailableException(
                    "PICO Spatial SDK space transition not available. " +
                    "Ensure pico-spatial-sdk.aar is in vendor/pico-sdk/ and you are running on PICO OS 6+."
                )
            }
            SpaceTransitionBridge.requestFullSpace()
        }
    }
}

class SpatialServiceUnavailableException(message: String) :
    CodedException("SERVICE_UNAVAILABLE", message, null)

class SpatialValidationException(message: String) :
    CodedException("VALIDATION_ERROR", message, null)

/**
 * Bridge façade for SpatialAnchorManager.createAnchor().
 *
 * SDK surface (best-known):
 *   SpatialAnchorManager.createAnchor(float px, float py, float pz,
 *                                     float ox, float oy, float oz, float ow)
 *     -> SpatialAnchorHandle  with fields: anchorId: String, persisted: Boolean
 */
private object SpatialAnchorBridge {

    private val CLASS_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.anchor.SpatialAnchorManager",
        "com.pvr.spatial.sdk.anchor.SpatialAnchorManager",
    )

    private val CREATE_METHOD_CANDIDATES = arrayOf(
        "createAnchor",
        "create",
    )

    @Volatile private var anchorClass: Class<*>? = null
    @Volatile private var anchorInstance: Any? = null
    @Volatile private var probed = false

    private fun getInstance(): Any? {
        if (!probed) {
            synchronized(this) {
                if (!probed) {
                    for (name in CLASS_CANDIDATES) {
                        try {
                            val c = Class.forName(name, true, javaClass.classLoader)
                            anchorClass = c
                            anchorInstance = c.getDeclaredConstructor().newInstance()
                            break
                        } catch (_: Throwable) { /* keep probing */ }
                    }
                    probed = true
                }
            }
        }
        return anchorInstance
    }

    fun createAnchor(px: Float, py: Float, pz: Float, ox: Float, oy: Float, oz: Float, ow: Float): Map<String, Any> {
        val inst = getInstance()
            ?: throw SpatialServiceUnavailableException("SpatialAnchorManager class not found on classpath")
        val clazz = anchorClass!!
        for (methodName in CREATE_METHOD_CANDIDATES) {
            try {
                val method = clazz.getMethod(methodName,
                    Float::class.java, Float::class.java, Float::class.java,
                    Float::class.java, Float::class.java, Float::class.java, Float::class.java)
                val handle = method.invoke(inst, px, py, pz, ox, oy, oz, ow)
                    ?: throw SpatialServiceUnavailableException("createAnchor returned null")
                val hc = handle.javaClass
                val anchorId = readStringFieldBestEffort(handle, hc, "anchorId", "id", "uuid") ?: "unknown"
                val persisted = readBooleanFieldBestEffort(handle, hc, "persisted", "isPersisted") ?: false
                return mapOf(
                    "id"        to anchorId,
                    "position"  to mapOf("x" to px, "y" to py, "z" to pz),
                    "rotation"  to mapOf("x" to ox, "y" to oy, "z" to oz, "w" to ow),
                    "anchorId"  to anchorId,
                    "persisted" to persisted,
                )
            } catch (e: CodedException) { throw e }
            catch (_: Throwable) { /* try next */ }
        }
        throw SpatialServiceUnavailableException("createAnchor method not found in SpatialAnchorManager")
    }

    private fun readStringFieldBestEffort(obj: Any, clazz: Class<*>, vararg names: String): String? {
        for (name in names) {
            try {
                val f = clazz.getDeclaredField(name); f.isAccessible = true
                val v = f.get(obj); if (v is String) return v
            } catch (_: Throwable) {}
        }
        return null
    }

    private fun readBooleanFieldBestEffort(obj: Any, clazz: Class<*>, vararg names: String): Boolean? {
        for (name in names) {
            try {
                val f = clazz.getDeclaredField(name); f.isAccessible = true
                val v = f.get(obj); if (v is Boolean) return v
            } catch (_: Throwable) {}
        }
        return null
    }
}

/**
 * Bridge façade for WindowContainerManager.setProperties().
 */
private object WindowContainerBridge {

    private val CLASS_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.window.WindowContainerManager",
        "com.pvr.spatial.sdk.window.WindowContainerManager",
    )

    private val SET_METHOD_CANDIDATES = arrayOf(
        "setProperties",
        "setWindowProperties",
        "configure",
    )

    @Volatile private var wc: Class<*>? = null
    @Volatile private var wcInst: Any? = null
    @Volatile private var probed = false

    private fun getInstance(): Any? {
        if (!probed) {
            synchronized(this) {
                if (!probed) {
                    for (name in CLASS_CANDIDATES) {
                        try {
                            val c = Class.forName(name, true, javaClass.classLoader)
                            wc = c; wcInst = c.getDeclaredConstructor().newInstance(); break
                        } catch (_: Throwable) {}
                    }
                    probed = true
                }
            }
        }
        return wcInst
    }

    fun setProperties(props: Map<String, Any>) {
        val inst = getInstance()
            ?: throw SpatialServiceUnavailableException("WindowContainerManager not found on classpath")
        val clazz = wc!!
        for (methodName in SET_METHOD_CANDIDATES) {
            try {
                val method = clazz.getMethod(methodName, Map::class.java)
                method.invoke(inst, props)
                return
            } catch (_: NoSuchMethodException) {}
            catch (e: java.lang.reflect.InvocationTargetException) {
                throw SpatialServiceUnavailableException("setWindowContainerProperties failed: ${e.cause?.message}")
            }
            catch (_: Throwable) {}
        }
        throw SpatialServiceUnavailableException("setProperties method not found in WindowContainerManager")
    }
}

/**
 * Bridge façade for SpaceTransitionManager.requestFullSpace().
 */
private object SpaceTransitionBridge {

    private val CLASS_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.space.SpaceTransitionManager",
        "com.pvr.spatial.sdk.space.SpaceTransitionManager",
    )

    private val REQUEST_METHOD_CANDIDATES = arrayOf(
        "requestFullSpace",
        "transitionToFullSpace",
        "enterFullSpace",
    )

    @Volatile private var stClass: Class<*>? = null
    @Volatile private var stInst: Any? = null
    @Volatile private var probed = false

    private fun getInstance(): Any? {
        if (!probed) {
            synchronized(this) {
                if (!probed) {
                    for (name in CLASS_CANDIDATES) {
                        try {
                            val c = Class.forName(name, true, javaClass.classLoader)
                            stClass = c; stInst = c.getDeclaredConstructor().newInstance(); break
                        } catch (_: Throwable) {}
                    }
                    probed = true
                }
            }
        }
        return stInst
    }

    fun requestFullSpace() {
        val inst = getInstance()
            ?: throw SpatialServiceUnavailableException("SpaceTransitionManager not found on classpath")
        val clazz = stClass!!
        for (methodName in REQUEST_METHOD_CANDIDATES) {
            try {
                val method = clazz.getMethod(methodName)
                method.invoke(inst)
                return
            } catch (_: NoSuchMethodException) {}
            catch (e: java.lang.reflect.InvocationTargetException) {
                throw SpatialServiceUnavailableException("requestFullSpace failed: ${e.cause?.message}")
            }
            catch (_: Throwable) {}
        }
        throw SpatialServiceUnavailableException("requestFullSpace method not found in SpaceTransitionManager")
    }
}
