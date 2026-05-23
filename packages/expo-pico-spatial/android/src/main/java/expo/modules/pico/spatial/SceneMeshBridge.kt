package expo.modules.pico.spatial

/**
 * Phase K — Scene mesh / room mesh reflection bridge.
 *
 * Targets PICO Spatial SDK MROManager.getSceneMesh() via reflection.
 *
 * SDK surface (best-known layout):
 *   com.picovr.spatial.sdk.mesh.MROManager
 *     .getSceneMesh() -> SceneMesh
 *
 *   SceneMesh fields:
 *     float[] vertices   — packed XYZ triples
 *     int[]   indices    — triangle index triples
 *     float[] normals    — packed XYZ triples (may be null)
 *
 * Returns null when the SDK is absent or the call fails.
 */
object SceneMeshBridge {

    private val MESH_CLASS_CANDIDATES = arrayOf(
        "com.picovr.spatial.sdk.mesh.MROManager",
        "com.pvr.spatial.sdk.mesh.MROManager",
        "com.picovr.spatial.sdk.mesh.SceneMeshManager",
    )

    private val GET_SCENE_MESH_METHODS = arrayOf(
        "getSceneMesh",
        "querySceneMesh",
    )

    private val VERTICES_FIELD = arrayOf("vertices", "mVertices")
    private val INDICES_FIELD  = arrayOf("indices", "mIndices", "triangleIndices")
    private val NORMALS_FIELD  = arrayOf("normals", "mNormals")

    @Volatile private var meshClass: Class<*>? = null
    @Volatile private var meshInstance: Any? = null
    @Volatile private var probed = false
    @Volatile private var sdkAvailable = false

    fun isSdkAvailable(): Boolean {
        if (!probed) probe()
        return sdkAvailable
    }

    fun getSceneMesh(): Map<String, Any>? {
        if (!isSdkAvailable()) return null
        return queryMesh()
    }

    private fun probe() {
        synchronized(this) {
            if (probed) return
            for (name in MESH_CLASS_CANDIDATES) {
                try {
                    val clazz = Class.forName(name, false, SceneMeshBridge::class.java.classLoader)
                    meshClass = clazz
                    sdkAvailable = true
                    break
                } catch (_: Throwable) { /* keep probing */ }
            }
            probed = true
        }
    }

    private fun getOrCreateInstance(): Any? {
        meshInstance?.let { return it }
        val clazz = meshClass ?: return null
        return try {
            val inst = clazz.getDeclaredConstructor().newInstance()
            meshInstance = inst
            inst
        } catch (_: Throwable) { null }
    }

    private fun queryMesh(): Map<String, Any>? {
        val clazz = meshClass ?: return null
        return try {
            val inst = getOrCreateInstance() ?: return null
            var meshResult: Any? = null
            for (methodName in GET_SCENE_MESH_METHODS) {
                try {
                    val method = clazz.getMethod(methodName)
                    meshResult = method.invoke(inst)
                    if (meshResult != null) break
                } catch (_: Throwable) { /* try next */ }
            }
            val mesh = meshResult ?: return null
            val meshClass2 = mesh.javaClass

            val vertices = readFloatArray(mesh, meshClass2, VERTICES_FIELD)
            val indices  = readIntArray(mesh, meshClass2, INDICES_FIELD)
            val normals  = readFloatArray(mesh, meshClass2, NORMALS_FIELD)

            if (vertices == null || indices == null) return null

            buildMap {
                put("vertices", vertices.toList())
                put("indices", indices.toList())
                if (normals != null) put("normals", normals.toList())
            }
        } catch (_: Throwable) {
            null
        }
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

    private fun readIntArray(obj: Any, clazz: Class<*>, names: Array<String>): IntArray? {
        for (name in names) {
            try {
                val f = clazz.getDeclaredField(name)
                f.isAccessible = true
                val v = f.get(obj)
                if (v is IntArray) return v
            } catch (_: Throwable) { /* try next */ }
        }
        return null
    }

    internal fun resetForTesting() {
        synchronized(this) {
            meshClass = null
            meshInstance = null
            probed = false
            sdkAvailable = false
        }
    }
}
