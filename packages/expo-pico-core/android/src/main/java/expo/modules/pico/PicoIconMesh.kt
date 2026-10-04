package expo.modules.pico

/**
 * Stroke mesh of an SVG icon, produced by the Eskiu runtime.
 *
 * [vertices] holds x, y pairs in the icon's user space (Lucide: 24x24, y down).
 * [indices] holds three vertex indices per triangle; values are below 2^24, so
 * the Int bit pattern equals the unsigned value.
 */
class PicoIconMesh(
  val vertices: FloatArray,
  val indices: IntArray,
) {
  val vertexCount: Int get() = vertices.size / 2
  val indexCount: Int get() = indices.size
}
