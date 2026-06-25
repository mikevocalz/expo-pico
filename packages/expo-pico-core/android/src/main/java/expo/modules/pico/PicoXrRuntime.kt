package expo.modules.pico

import java.lang.reflect.Method

/**
 * XR display capabilities (refresh rate, foveation, passthrough).
 *
 * All methods are reflection-gated to PICO's `PXR_Plugin` (the in-process
 * VR plugin shipped on PICO OS 6 / Swan). When the class is absent (mobile
 * emulator, non-PICO Android target, or PICO build without the plugin .so),
 * each method returns null / false rather than throwing. Callers are
 * expected to treat null as "feature unavailable on this device" and fall
 * back to whatever default the renderer uses.
 *
 * Why reflection: `PXR_Plugin` ships as a system AAR side-loaded by PICO
 * OS — it is not on Maven and we cannot link against it at compile time
 * without forcing every consumer to drop in a PICO SDK that they may not
 * have entitlements for. The reflection path lets the same APK install
 * and run on a mobile emulator (SDK absent → null) and on a PICO Swan
 * device (SDK present → real values).
 *
 * Three surfaces:
 *
 *   - Refresh rate: `XR_FB_display_refresh_rate` is the OpenXR standard
 *     extension PICO implements. Get + set + query supported list.
 *   - Foveation: `XR_FB_foveation` is the OpenXR standard. Set level (off /
 *     low / med / high / dynamic).
 *   - Passthrough: `XR_FB_passthrough` is the OpenXR standard. Enable +
 *     query state.
 *
 * For the renderer-driven path (Babylon Native, Unity, react-three-fiber +
 * expo-gl), the OpenXR session manages all three through the standard
 * extensions and these helpers are only needed for non-render-loop
 * inspection (e.g. a settings page that shows the current refresh rate).
 */
internal object PicoXrRuntime {

    private const val PXR_PLUGIN = "com.picovr.cvinterface.PXR_Plugin"

    /**
     * @return current display refresh rate in Hz, or null when the SDK is
     *   unavailable / the call fails. Reads `PXR_Plugin.getDisplayRefreshRate()`
     *   if present.
     */
    fun getCurrentRefreshRate(): Float? {
        return invokeStaticFloat(PXR_PLUGIN, "getDisplayRefreshRate")
    }

    /**
     * @return list of refresh rates supported by the current display, or
     *   null when the SDK is unavailable. Reads
     *   `PXR_Plugin.getSupportedDisplayRefreshRates()` if present and
     *   converts the float[] return value to a List<Float>.
     */
    fun getSupportedRefreshRates(): List<Float>? {
        return try {
            val clazz = Class.forName(PXR_PLUGIN, false, javaClass.classLoader)
            val method = clazz.getDeclaredMethod("getSupportedDisplayRefreshRates")
            method.isAccessible = true
            val result = method.invoke(null) ?: return null
            when (result) {
                is FloatArray -> result.toList()
                is Array<*> -> result.filterIsInstance<Number>().map { it.toFloat() }
                else -> null
            }
        } catch (_: Throwable) {
            null
        }
    }

    /**
     * Request a specific display refresh rate. Returns true when the
     * underlying setter accepted the request, false otherwise. The OS may
     * silently clamp the requested rate to the closest supported value;
     * caller should re-query [getCurrentRefreshRate] to confirm.
     */
    fun setRefreshRate(hz: Float): Boolean {
        return invokeStaticUnit(PXR_PLUGIN, "setDisplayRefreshRate", arrayOf(Float::class.javaPrimitiveType!!), arrayOf(hz))
    }

    /**
     * Set foveation level. Maps stable JS-side names to PICO's int enum:
     *   off=0, low=1, medium=2, high=3, dynamic=4
     * Returns false when the SDK is unavailable.
     */
    fun setFoveationLevel(level: String): Boolean {
        val ord = when (level.lowercase()) {
            "off", "none" -> 0
            "low" -> 1
            "medium", "med" -> 2
            "high" -> 3
            "dynamic", "auto" -> 4
            else -> return false
        }
        return invokeStaticUnit(
            PXR_PLUGIN,
            "setFoveationLevel",
            arrayOf(Int::class.javaPrimitiveType!!),
            arrayOf(ord)
        )
    }

    /**
     * @return current foveation level as a stable string, or null when
     *   unavailable. Reads `PXR_Plugin.getFoveationLevel()` and maps the
     *   int return to "off" / "low" / "medium" / "high" / "dynamic".
     */
    fun getFoveationLevel(): String? {
        val ord = invokeStaticInt(PXR_PLUGIN, "getFoveationLevel") ?: return null
        return when (ord) {
            0 -> "off"
            1 -> "low"
            2 -> "medium"
            3 -> "high"
            4 -> "dynamic"
            else -> null
        }
    }

    /**
     * Enable / disable passthrough. Returns false when the SDK is
     * unavailable. Note: enabling passthrough requires the consumer to
     * also flip `passthrough: true` in the prebuild plugin (which emits
     * the `pico.hardware.passthrough` uses-feature) and the device must
     * support it (PICO 4 / 4 Pro / 4 Ultra). Failures cascade silently —
     * caller should re-query [isPassthroughActive] to confirm.
     */
    fun setPassthroughEnabled(enabled: Boolean): Boolean {
        return invokeStaticUnit(
            PXR_PLUGIN,
            "setPassthroughEnabled",
            arrayOf(Boolean::class.javaPrimitiveType!!),
            arrayOf(enabled)
        )
    }

    /**
     * @return whether passthrough is currently active, or null when the
     *   SDK is unavailable / the call fails.
     */
    fun isPassthroughActive(): Boolean? {
        return invokeStaticBoolean(PXR_PLUGIN, "isPassthroughActive")
    }

    // ── Reflection helpers ──────────────────────────────────────────

    private fun invokeStaticFloat(className: String, methodName: String): Float? {
        return invokeStatic(className, methodName, emptyArray(), emptyArray())?.let {
            (it as? Number)?.toFloat()
        }
    }

    private fun invokeStaticInt(className: String, methodName: String): Int? {
        return invokeStatic(className, methodName, emptyArray(), emptyArray())?.let {
            (it as? Number)?.toInt()
        }
    }

    private fun invokeStaticBoolean(className: String, methodName: String): Boolean? {
        return invokeStatic(className, methodName, emptyArray(), emptyArray())?.let {
            it as? Boolean
        }
    }

    private fun invokeStaticUnit(
        className: String,
        methodName: String,
        argTypes: Array<Class<*>>,
        args: Array<Any>,
    ): Boolean {
        return try {
            val clazz = Class.forName(className, false, javaClass.classLoader)
            val method: Method = clazz.getDeclaredMethod(methodName, *argTypes)
            method.isAccessible = true
            method.invoke(null, *args)
            true
        } catch (_: Throwable) {
            false
        }
    }

    private fun invokeStatic(
        className: String,
        methodName: String,
        argTypes: Array<Class<*>>,
        args: Array<Any>,
    ): Any? {
        return try {
            val clazz = Class.forName(className, false, javaClass.classLoader)
            val method: Method = clazz.getDeclaredMethod(methodName, *argTypes)
            method.isAccessible = true
            method.invoke(null, *args)
        } catch (_: Throwable) {
            null
        }
    }
}
