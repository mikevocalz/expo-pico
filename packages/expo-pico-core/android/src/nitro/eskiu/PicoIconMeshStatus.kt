package expo.modules.pico

/** Status codes from expo_pico_eskiu.h (EXPO_PICO_ICON_*) and the JNI bridge. */
internal object PicoIconMeshStatus {
  const val OK = 0
  const val RUNTIME_UNAVAILABLE = -100

  /** Throws for any non-OK status, naming the failure the way the JS side expects. */
  fun check(status: Int) {
    val message = when (status) {
      OK -> return
      -1 -> "ICON_MESH_INVALID_INPUT: the icon markup was null"
      -2 -> "ICON_MESH_INVALID_INPUT: strokeWidth and tolerance must be finite, > 0 and <= 1000"
      -3 -> "ICON_MESH_PARSE_ERROR: malformed SVG element markup or path data"
      -4 -> "ICON_MESH_LIMIT: a subpath exceeds 2048 points or the mesh exceeds 2^24 entries; raise tolerance"
      -5 -> "ICON_MESH_INTERNAL: fill pass outgrew the size pass"
      RUNTIME_UNAVAILABLE -> UNAVAILABLE
      else -> "ICON_MESH_INTERNAL: unknown status $status"
    }
    throw IllegalArgumentException(message)
  }

  const val UNAVAILABLE =
    "ESKIU_RUNTIME_UNAVAILABLE: this build has no Eskiu runtime. Icon meshes need an arm64-v8a " +
      "build compiled with eskiuc >= 0.9.3 on PATH or in ESKIUC (see `yarn eskiu:doctor`)."
}
