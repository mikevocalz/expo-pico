package expo.modules.pico

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Controller haptics runtime binding.
 *
 * Wraps PICO Platform SDK `PXR_Plugin.UPxr_VibrateController` via
 * reflection so the module is safe when the SDK AAR is absent.
 *
 * SDK surface:
 *   com.pvr.sdk.PXR_Plugin
 *   static void UPxr_VibrateController(int controller, float amplitude, int duration)
 *
 *   controller: 0 = left, 1 = right, 2 = both
 *   amplitude:  0.0 – 1.0 (clamped on PICO OS; clamped here for clarity)
 *   duration:   milliseconds > 0
 *
 * If the SDK class is absent every call rejects with SERVICE_UNAVAILABLE.
 * No crash, no silent no-op.
 */
class ExpoPicoHapticsModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("ExpoPicoHaptics")

        Constants(
            "hapticsAvailable" to HapticsBridge.isAvailable()
        )

        AsyncFunction("pulseHaptic") { hand: String, amplitude: Double, durationMs: Int ->
            if (!HapticsBridge.isAvailable()) {
                throw ServiceUnavailableException("Controller haptics SDK not available on this device or build")
            }
            val controller = when (hand.lowercase()) {
                "left"  -> 0
                "right" -> 1
                "both"  -> 2
                else    -> throw ValidationException("hand must be 'left', 'right', or 'both'; got '$hand'")
            }
            if (durationMs <= 0) {
                throw ValidationException("durationMs must be > 0; got $durationMs")
            }
            val clampedAmplitude = amplitude.coerceIn(0.0, 1.0).toFloat()
            HapticsBridge.vibrate(controller, clampedAmplitude, durationMs)
        }

        Function("isHapticsAvailable") {
            HapticsBridge.isAvailable()
        }
    }
}

class ServiceUnavailableException(message: String) :
    CodedException("SERVICE_UNAVAILABLE", message, null)

class ValidationException(message: String) :
    CodedException("VALIDATION_ERROR", message, null)

/**
 * Bridge façade for `com.pvr.sdk.PXR_Plugin.UPxr_VibrateController`.
 *
 * Uses `initialize = false` for the availability check so missing native
 * .so files (classloader can resolve the .class but native init fails)
 * don't throw at probe time. The method is only invoked when `isAvailable`
 * returns true, at which point the SDK is also runtime-linked on PICO OS.
 */
internal object HapticsBridge {

    private val HAPTICS_CLASS_CANDIDATES = arrayOf(
        "com.pvr.sdk.PXR_Plugin",
        "com.pvr.platform.sdk.PXR_Plugin",
    )

    private val METHOD_NAME_CANDIDATES = arrayOf(
        "UPxr_VibrateController",
        "vibrateController",
    )

    @Volatile private var resolved: Pair<Class<*>, java.lang.reflect.Method>? = null
    @Volatile private var probeComplete = false
    @Volatile private var probeResult = false

    fun isAvailable(): Boolean {
        if (!probeComplete) resolve()
        return probeResult
    }

    fun vibrate(controller: Int, amplitude: Float, durationMs: Int) {
        val (_, method) = resolve() ?: throw ServiceUnavailableException(
            "PXR_Plugin.UPxr_VibrateController not found on classpath"
        )
        try {
            method.invoke(null, controller, amplitude, durationMs)
        } catch (e: java.lang.reflect.InvocationTargetException) {
            throw ServiceUnavailableException("Haptics SDK call failed: ${e.cause?.message ?: e.message}")
        } catch (e: Throwable) {
            throw ServiceUnavailableException("Haptics SDK unavailable: ${e.message}")
        }
    }

    private fun resolve(): Pair<Class<*>, java.lang.reflect.Method>? {
        resolved?.let { return it }
        synchronized(this) {
            resolved?.let { return it }
            for (className in HAPTICS_CLASS_CANDIDATES) {
                val clazz = tryLoadClass(className) ?: continue
                for (methodName in METHOD_NAME_CANDIDATES) {
                    val method = tryFindMethod(clazz, methodName, Int::class.java, Float::class.java, Int::class.java)
                        ?: continue
                    val pair = Pair(clazz, method)
                    resolved = pair
                    probeResult = true
                    probeComplete = true
                    return pair
                }
            }
            probeResult = false
            probeComplete = true
            return null
        }
    }

    private fun tryLoadClass(name: String): Class<*>? = try {
        Class.forName(name, false, HapticsBridge::class.java.classLoader)
    } catch (_: Throwable) { null }

    private fun tryFindMethod(clazz: Class<*>, name: String, vararg params: Class<*>): java.lang.reflect.Method? = try {
        val m = clazz.getMethod(name, *params)
        m.isAccessible = true
        m
    } catch (_: Throwable) { null }
}
