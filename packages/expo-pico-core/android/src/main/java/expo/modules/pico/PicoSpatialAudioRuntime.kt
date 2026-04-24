package expo.modules.pico

/**
 * Phase K — spatial audio engine reflection probe.
 *
 * PICO ships a head-tracked spatial audio engine on Project Swan that
 * downmixes positional sources to head-related transfer functions on
 * the device. Reflection-gated to `com.picovr.spatialaudio.SpatialAudioApi`
 * (best-known class name).
 *
 * For most apps the renderer / audio middleware (Wwise, FMOD, Oboe) drives
 * spatial audio directly through Android's MediaSession or the device's
 * default audio HAL — these helpers are useful only for apps that need to
 * configure PICO's HRTF profile explicitly.
 */
internal object PicoSpatialAudioRuntime {

    private val SPATIAL_AUDIO_CANDIDATES = arrayOf(
        "com.picovr.spatialaudio.SpatialAudioApi",
        "com.pvr.spatialaudio.SpatialAudio",
    )

    /**
     * @return whether the spatial audio engine is enabled, or null when
     *   the SDK is unavailable.
     */
    fun isSpatialAudioEnabled(): Boolean? {
        val cls = PicoPlatformSdkDetector.findAvailable(*SPATIAL_AUDIO_CANDIDATES) ?: return null
        return invokeBoolean(cls, "isEnabled") ?: invokeBoolean(cls, "isSpatialAudioEnabled")
    }

    /**
     * Enable / disable the spatial audio engine. Returns true when the
     * call was dispatched.
     */
    fun setSpatialAudioEnabled(enabled: Boolean): Boolean {
        val cls = PicoPlatformSdkDetector.findAvailable(*SPATIAL_AUDIO_CANDIDATES) ?: return false
        return invokeUnit(cls, "setEnabled", arrayOf(Boolean::class.javaPrimitiveType!!), arrayOf(enabled)) ||
            invokeUnit(cls, "setSpatialAudioEnabled", arrayOf(Boolean::class.javaPrimitiveType!!), arrayOf(enabled))
    }

    /**
     * @return current HRTF profile name, or null when unavailable. PICO
     *   exposes a small set of predefined profiles ("default", "personal",
     *   etc.) tuned for different head shapes; the consumer typically
     *   leaves this on "default".
     */
    fun getHrtfProfile(): String? {
        val cls = PicoPlatformSdkDetector.findAvailable(*SPATIAL_AUDIO_CANDIDATES) ?: return null
        return invokeNoArg(cls, "getHrtfProfile") as? String
    }

    private fun invokeBoolean(className: String, methodName: String): Boolean? {
        return invokeNoArg(className, methodName) as? Boolean
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
