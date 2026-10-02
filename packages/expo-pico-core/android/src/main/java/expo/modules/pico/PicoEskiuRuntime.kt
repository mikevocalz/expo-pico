package expo.modules.pico

/**
 * Tiny JNI seam into the allocation-free Eskiu runtime.
 *
 * PICO arm64 builds compile the .esk source. Other/dev ABIs link an
 * ABI-compatible C++ fallback so the Expo module remains buildable without
 * requiring an Eskiu compiler on every developer machine.
 */
internal object PicoEskiuRuntime {
    private val loaded: Boolean = runCatching {
        System.loadLibrary("ExpoPicoEskiu")
        true
    }.getOrDefault(false)

    private external fun nativeAbiVersion(): Int
    private external fun nativeClamp01(value: Float): Float
    private external fun nativeHapticAmplitude(value: Float): Float
    private external fun nativePassthroughLevel(value: Float): Float
    private external fun nativeCapabilityEnabled(declared: Long, available: Long, bitIndex: Int): Boolean

    val abiVersion: Int
        get() = if (loaded) runCatching { nativeAbiVersion() }.getOrDefault(0) else 0

    fun clamp01(value: Float): Float =
        if (loaded) runCatching { nativeClamp01(value) }.getOrElse { value.coerceIn(0f, 1f) }
        else value.coerceIn(0f, 1f)

    fun hapticAmplitude(value: Float): Float =
        if (loaded) runCatching { nativeHapticAmplitude(value) }.getOrElse { value.coerceIn(0f, 1f) }
        else value.coerceIn(0f, 1f)

    fun passthroughLevel(value: Float): Float =
        if (loaded) runCatching { nativePassthroughLevel(value) }.getOrElse { value.coerceIn(0f, 1f) }
        else value.coerceIn(0f, 1f)

    fun capabilityEnabled(declared: Long, available: Long, bitIndex: Int): Boolean =
        if (loaded) runCatching { nativeCapabilityEnabled(declared, available, bitIndex) }.getOrDefault(false)
        else bitIndex in 0..63 && (declared and (1L shl bitIndex)) != 0L && (available and (1L shl bitIndex)) != 0L
}
