package expo.modules.pico

internal object PicoEskiuBridge {
  private val loaded: Boolean by lazy {
    runCatching {
      System.loadLibrary("ExpoPicoCore")
      true
    }.getOrDefault(false)
  }

  fun normalizeHapticAmplitude(value: Double): Double =
    if (loaded) hapticAmplitude(value) else value.coerceIn(0.0, 1.0)

  fun normalizePassthroughLevel(value: Double): Double =
    if (loaded) passthroughLevel(value) else value.coerceIn(0.0, 1.0)

  fun isCapabilityEnabled(declared: Long, available: Long, bit: Int): Boolean =
    if (loaded) capabilityEnabled(declared, available, bit)
    else bit in 0..63 &&
      ((declared ushr bit) and 1L) == 1L &&
      ((available ushr bit) and 1L) == 1L

  /**
   * Meshes the stroke of SVG element markup (two-call size/fill, caller-owned
   * arrays, no native allocation). Synchronous; the work is proportional to
   * the mesh size, about 1,000 vertices for Lucide's busiest curated icon.
   */
  fun iconMesh(svgElements: String, strokeWidth: Float, tolerance: Float): PicoIconMesh {
    if (!loaded) throw IllegalStateException(PicoIconMeshStatus.UNAVAILABLE)
    val counts = IntArray(2)
    PicoIconMeshStatus.check(iconMeshSize(svgElements, strokeWidth, tolerance, counts))
    val vertices = FloatArray(counts[0] * 2)
    val indices = IntArray(counts[1])
    PicoIconMeshStatus.check(iconMeshFill(svgElements, strokeWidth, tolerance, vertices, indices, counts))
    return PicoIconMesh(vertices, indices)
  }

  private external fun iconMeshSize(
    svgElements: String,
    strokeWidth: Float,
    tolerance: Float,
    counts: IntArray,
  ): Int

  private external fun iconMeshFill(
    svgElements: String,
    strokeWidth: Float,
    tolerance: Float,
    vertices: FloatArray,
    indices: IntArray,
    counts: IntArray,
  ): Int

  private external fun hapticAmplitude(value: Double): Double
  private external fun passthroughLevel(value: Double): Double
  private external fun capabilityEnabled(declared: Long, available: Long, bit: Int): Boolean
}
