package expo.modules.pico

/**
 * controller input + haptics + Motion Tracker accessory access.
 *
 * Reflection-gated to PICO's `cvinterface` SDK. Three surfaces:
 *
 *   - Controller state: button + thumbstick + trigger snapshot per hand.
 *   - Haptic feedback:  fire-and-forget vibration on a controller.
 *   - Motion Tracker:   waist + foot dongle accessory pose data.
 *
 * For an OpenXR-driven renderer (Babylon Native, Unity), button + axis
 * state goes through standard `XR_*_input` action sets and these helpers
 * are unnecessary in the render loop. They're useful for non-XR
 * inspection paths (e.g. a settings page that visualizes the connected
 * controllers).
 */
internal object PicoControllerRuntime {

    private val CONTROLLER_CANDIDATES = arrayOf(
        "com.picovr.cvinterface.PXR_Plugin",
        "com.pvr.controller.ControllerApi",
    )

    private val HAPTICS_CANDIDATES = arrayOf(
        "com.picovr.cvinterface.PXR_Plugin",
        "com.pvr.haptics.HapticsApi",
    )

    private val MOTION_TRACKER_CANDIDATES = arrayOf(
        "com.picovr.cvinterface.PXR_MotionTracker",
        "com.pvr.motiontracker.MotionTrackerApi",
    )

    // ── Controller state ────────────────────────────────────────────

    /**
     * @return list of connected controllers, or null when SDK absent.
     *   Each entry:
     *   - `hand`:        "left" | "right" | "unknown"
     *   - `connected`:   Boolean
     *   - `batteryPct`:  Int 0..100 (-1 when unknown)
     *   - `model`:       String (e.g. "PICO 4", "PICO Sense", "Neo3")
     */
    fun getControllers(): List<Map<String, Any?>>? {
        val cls = PicoPlatformSdkDetector.findAvailable(*CONTROLLER_CANDIDATES) ?: return null
        @Suppress("UNCHECKED_CAST")
        return invokeNoArg(cls, "getConnectedControllers") as? List<Map<String, Any?>>
            ?: invokeNoArg(cls, "getControllers") as? List<Map<String, Any?>>
            ?: emptyList<Map<String, Any?>>()
    }

    // ── Haptic feedback ─────────────────────────────────────────────

    /**
     * Fire a haptic pulse on the named hand controller. `amplitude` is
     * 0..1 (clamped). `durationMs` is rounded to the nearest ms.
     * Returns true when the call was dispatched.
     */
    fun triggerHaptic(hand: String, amplitude: Float, durationMs: Int): Boolean {
        val handOrd = when (hand.lowercase()) {
            "left" -> 0
            "right" -> 1
            else -> return false
        }
        val cls = PicoPlatformSdkDetector.findAvailable(*HAPTICS_CANDIDATES) ?: return false
        val clamped = amplitude.coerceIn(0f, 1f)
        val ms = durationMs.coerceAtLeast(0)
        // Try the modern (handIndex, amplitude, durationMs) signature, then
        // the legacy (handIndex, intensityInt) signature.
        return invokeUnit(
            cls, "triggerHapticPulse",
            arrayOf(
                Int::class.javaPrimitiveType!!,
                Float::class.javaPrimitiveType!!,
                Int::class.javaPrimitiveType!!,
            ),
            arrayOf(handOrd, clamped, ms)
        ) || invokeUnit(
            cls, "vibrate",
            arrayOf(
                Int::class.javaPrimitiveType!!,
                Int::class.javaPrimitiveType!!,
            ),
            arrayOf(handOrd, ms)
        )
    }

    // ── Motion Tracker accessory ────────────────────────────────────

    /**
     * @return list of attached PICO Motion Tracker dongles, or null when
     *   SDK absent. Each entry:
     *   - `id`:        String unique within session
     *   - `attachment`: "waist" | "leftFoot" | "rightFoot" | "unknown"
     *   - `connected`: Boolean
     *   - `position`:  [x, y, z] float meters in tracking space
     *   - `rotation`:  [x, y, z, w] quaternion
     *   - `batteryPct`: Int 0..100 (-1 when unknown)
     */
    fun getMotionTrackers(): List<Map<String, Any?>>? {
        val cls = PicoPlatformSdkDetector.findAvailable(*MOTION_TRACKER_CANDIDATES) ?: return null
        @Suppress("UNCHECKED_CAST")
        return invokeNoArg(cls, "getMotionTrackers") as? List<Map<String, Any?>>
            ?: invokeNoArg(cls, "getTrackers") as? List<Map<String, Any?>>
            ?: emptyList<Map<String, Any?>>()
    }

    // ── Reflection helpers ──────────────────────────────────────────

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
