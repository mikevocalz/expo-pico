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

  private external fun hapticAmplitude(value: Double): Double
  private external fun passthroughLevel(value: Double): Double
  private external fun capabilityEnabled(declared: Long, available: Long, bit: Int): Boolean
}
