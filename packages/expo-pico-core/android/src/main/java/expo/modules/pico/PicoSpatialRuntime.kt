package expo.modules.pico

/**
 * spatial / boundary / scene-mesh / passthrough surfaces.
 *
 * Reflection-gated to PICO's `cvinterface` SDK. All callers degrade
 * gracefully when the SDK is absent (mobile emulator, non-PICO target).
 *
 * Surfaces:
 *   - Boundary / Guardian: query whether the user is within their play
 *     space, and the geometry of the boundary outline. Used to gate
 *     room-scale gameplay (e.g. dim the renderer when the user crosses).
 *   - Scene mesh: room-reconstructed triangle mesh (separate API from
 *     the plane-only sceneUnderstanding surface).
 *   - Scene understanding: detected planes (floors, walls, tables) for
 *     simple physics + UI placement.
 *
 * For an OpenXR-driven renderer (Babylon Native, Unity), boundary geometry
 * is exposed via `XR_PICO_boundary_ext` and scene meshes via PICO's
 * spatial-anchor extensions. These helpers are useful for non-render
 * inspection (e.g. a settings page that visualizes the boundary in 2D).
 */
internal object PicoSpatialRuntime {

    private val BOUNDARY_CANDIDATES = arrayOf(
        "com.picovr.cvinterface.PXR_Boundary",
        "com.pvr.boundary.BoundaryApi",
    )

    private val SCENE_MESH_CANDIDATES = arrayOf(
        "com.picovr.scene.PXRSceneMeshApi",
        "com.pvr.scene.SceneMeshApi",
    )

    private val SCENE_UNDERSTANDING_CANDIDATES = arrayOf(
        "com.picovr.scene.PXRSceneApi",
        "com.pvr.scene.SceneApi",
    )

    // ── Boundary / Guardian ─────────────────────────────────────────

    /**
     * Whether the boundary system is enabled. Returns null when the SDK
     * is unavailable.
     */
    fun isBoundaryVisible(): Boolean? {
        val cls = PicoPlatformSdkDetector.findAvailable(*BOUNDARY_CANDIDATES) ?: return null
        return invokeBoolean(cls, "isBoundaryVisible") ?: invokeBoolean(cls, "isVisible")
    }

    /**
     * Show or hide the boundary outline overlay. Returns true when the
     * call was dispatched, false otherwise.
     */
    fun setBoundaryVisible(visible: Boolean): Boolean {
        val cls = PicoPlatformSdkDetector.findAvailable(*BOUNDARY_CANDIDATES) ?: return false
        return invokeUnit(cls, "setBoundaryVisible", arrayOf(Boolean::class.javaPrimitiveType!!), arrayOf(visible)) ||
            invokeUnit(cls, "setVisible", arrayOf(Boolean::class.javaPrimitiveType!!), arrayOf(visible))
    }

    /**
     * @return list of [x, y, z] vertices defining the boundary polygon
     *   in tracking space, or null when the SDK is unavailable. Empty
     *   list when boundary is configured as "stationary" (no polygon).
     */
    fun getBoundaryGeometry(): List<List<Float>>? {
        val cls = PicoPlatformSdkDetector.findAvailable(*BOUNDARY_CANDIDATES) ?: return null
        return invokeAndConvertVertices(cls, "getBoundaryGeometry")
            ?: invokeAndConvertVertices(cls, "getGeometry")
            ?: invokeAndConvertVertices(cls, "getPlayAreaPoints")
    }

    // ── Scene mesh ──────────────────────────────────────────────────

    /**
     * Trigger an SDK-side rescan of the room. Returns true when the
     * request was dispatched. The result becomes available via
     * [getSceneMeshTriangles] on a subsequent call (typically tens of
     * milliseconds later).
     */
    fun refreshSceneMesh(): Boolean {
        val cls = PicoPlatformSdkDetector.findAvailable(*SCENE_MESH_CANDIDATES) ?: return false
        return invokeUnit(cls, "refresh", emptyArray(), emptyArray()) ||
            invokeUnit(cls, "rescan", emptyArray(), emptyArray()) ||
            invokeUnit(cls, "requestSceneMeshUpdate", emptyArray(), emptyArray())
    }

    /**
     * @return scene-mesh triangle count, or null when unavailable. We
     *   intentionally don't surface the raw mesh data through the JS
     *   bridge — moving 100k+ float vertices through the JNI bridge each
     *   frame is prohibitive. Apps that need mesh access should drop in a
     *   native Kotlin/C++ scene-mesh consumer; this counter is for
     *   diagnostics ("did the scan return something?").
     */
    fun getSceneMeshTriangleCount(): Int? {
        val cls = PicoPlatformSdkDetector.findAvailable(*SCENE_MESH_CANDIDATES) ?: return null
        return invokeInt(cls, "getTriangleCount") ?: invokeInt(cls, "getMeshTriangleCount")
    }

    // ── Scene understanding (planes) ────────────────────────────────

    /**
     * @return list of detected planes, or null. Each entry:
     *   - `id`:        String unique within session
     *   - `label`:     String ("floor", "wall", "ceiling", "table", "other")
     *   - `center`:    [x, y, z]
     *   - `extent`:    [width, height] in meters
     *   - `normal`:    [x, y, z] unit
     */
    fun getDetectedPlanes(): List<Map<String, Any?>>? {
        val cls = PicoPlatformSdkDetector.findAvailable(*SCENE_UNDERSTANDING_CANDIDATES) ?: return null
        @Suppress("UNCHECKED_CAST")
        return (
            invokeNoArg(cls, "getDetectedPlanes") as? List<Map<String, Any?>>
                ?: invokeNoArg(cls, "getPlanes") as? List<Map<String, Any?>>
                ?: emptyList<Map<String, Any?>>()
        )
    }

    /**
     * Trigger a scan for new planes. Returns true when the request was
     * dispatched.
     */
    fun refreshScene(): Boolean {
        val cls = PicoPlatformSdkDetector.findAvailable(*SCENE_UNDERSTANDING_CANDIDATES) ?: return false
        return invokeUnit(cls, "refresh", emptyArray(), emptyArray()) ||
            invokeUnit(cls, "rescan", emptyArray(), emptyArray()) ||
            invokeUnit(cls, "requestSceneUpdate", emptyArray(), emptyArray())
    }

    // ── Reflection helpers ──────────────────────────────────────────

    private fun invokeAndConvertVertices(className: String, methodName: String): List<List<Float>>? {
        val raw = invokeNoArg(className, methodName) ?: return null
        @Suppress("UNCHECKED_CAST")
        return when (raw) {
            is FloatArray -> raw.toList().chunked(3)
            is Array<*> -> {
                val first = raw.firstOrNull()
                when (first) {
                    is Number -> raw.filterIsInstance<Number>().map { it.toFloat() }.chunked(3)
                    is FloatArray -> raw.filterIsInstance<FloatArray>().map { it.toList() }
                    is List<*> -> raw.filterIsInstance<List<*>>()
                        .map { sub -> sub.filterIsInstance<Number>().map { n -> n.toFloat() } }
                    else -> null
                }
            }
            is List<*> -> {
                val first = raw.firstOrNull()
                when (first) {
                    is Number -> raw.filterIsInstance<Number>().map { it.toFloat() }.chunked(3)
                    is List<*> -> raw.filterIsInstance<List<*>>()
                        .map { sub -> sub.filterIsInstance<Number>().map { n -> n.toFloat() } }
                    else -> null
                }
            }
            else -> null
        }
    }

    private fun invokeBoolean(className: String, methodName: String): Boolean? {
        return invokeNoArg(className, methodName) as? Boolean
    }

    private fun invokeInt(className: String, methodName: String): Int? {
        return (invokeNoArg(className, methodName) as? Number)?.toInt()
    }

    private fun invokeUnit(
        className: String,
        methodName: String,
        argTypes: Array<Class<*>>,
        args: Array<Any>,
    ): Boolean {
        return try {
            val clazz = Class.forName(className, false, javaClass.classLoader)
            val method = clazz.getDeclaredMethod(methodName, *argTypes)
            method.isAccessible = true
            method.invoke(null, *args)
            true
        } catch (_: Throwable) {
            false
        }
    }

    private fun invokeNoArg(className: String, methodName: String): Any? {
        return try {
            val clazz = Class.forName(className, false, javaClass.classLoader)
            val method = clazz.getDeclaredMethod(methodName)
            method.isAccessible = true
            method.invoke(null)
        } catch (_: Throwable) {
            null
        }
    }
}
