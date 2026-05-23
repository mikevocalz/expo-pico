package expo.modules.pico

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Phase K — PICO passthrough / mixed-reality dial module.
 *
 * The physical transparency dial on PICO 4 / PICO 4 Ultra broadcasts an intent
 * whenever the user turns it:
 *
 *   Action:  com.picovr.ACTION_PASSTHROUGH_LEVEL_CHANGED
 *   Extra:   "level"  Float  0.0 (fully virtual) → 1.0 (fully real-world)
 *
 * This module:
 *   1. Listens for that broadcast and emits `onPassthroughLevelChanged` to JS.
 *   2. Exposes `setPassthrough(enabled, level)` for JS-driven programmatic
 *      control via PXR_Plugin reflection (same pattern as haptics).
 *   3. Reads the current passthrough state as a startup constant.
 *
 * On non-PICO devices or when PXR_Plugin is absent the module is safe — the
 * receiver simply never fires and setPassthrough rejects with SERVICE_UNAVAILABLE.
 */
class ExpoPicoPassthroughModule : Module() {

    companion object {
        private const val ACTION_LEVEL_CHANGED = "com.picovr.ACTION_PASSTHROUGH_LEVEL_CHANGED"
        private const val EXTRA_LEVEL = "level"
    }

    private var receiver: BroadcastReceiver? = null
    private var listenerCount = 0

    override fun definition() = ModuleDefinition {
        Name("ExpoPicoPassthrough")

        Constants(
            "passthroughAvailable" to PassthroughBridge.isSdkAvailable()
        )

        Events("onPassthroughLevelChanged")

        OnStartObserving {
            listenerCount++
            if (listenerCount == 1) registerReceiver()
        }

        OnStopObserving {
            listenerCount = maxOf(0, listenerCount - 1)
            if (listenerCount == 0) unregisterReceiver()
        }

        /**
         * Programmatically enable/disable passthrough and set the transparency level.
         *
         * @param enabled  true = show real-world background, false = opaque VR background
         * @param level    0.0–1.0 transparency (0 = fully virtual, 1 = fully see-through)
         *
         * Rejects with SERVICE_UNAVAILABLE if PXR_Plugin is not present.
         */
        AsyncFunction("setPassthrough") { enabled: Boolean, level: Double ->
            if (!PassthroughBridge.isSdkAvailable()) {
                throw PassthroughUnavailableException(
                    "PICO Platform SDK not available. " +
                    "Ensure pico-platform-sdk.aar is in vendor/pico-sdk/."
                )
            }
            val clampedLevel = level.coerceIn(0.0, 1.0).toFloat()
            PassthroughBridge.setPassthrough(enabled, clampedLevel)
        }

        Function("isPassthroughAvailable") {
            PassthroughBridge.isSdkAvailable()
        }

        OnActivityEntersBackground {
            unregisterReceiver()
        }

        OnActivityEntersForeground {
            if (listenerCount > 0) registerReceiver()
        }

        OnDestroy {
            listenerCount = 0
            unregisterReceiver()
        }
    }

    private fun registerReceiver() {
        if (receiver != null) return
        val ctx = appContext.reactContext ?: return
        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action != ACTION_LEVEL_CHANGED) return
                val level = intent.getFloatExtra(EXTRA_LEVEL, -1f)
                if (level < 0f) return
                sendEvent(
                    "onPassthroughLevelChanged",
                    mapOf(
                        "level" to level.toDouble(),
                        "enabled" to (level > 0f),
                    )
                )
            }
        }
        val filter = IntentFilter(ACTION_LEVEL_CHANGED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ctx.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            ctx.registerReceiver(receiver, filter)
        }
    }

    private fun unregisterReceiver() {
        val ctx = appContext.reactContext ?: return
        receiver?.let {
            try { ctx.unregisterReceiver(it) } catch (_: IllegalArgumentException) {}
            receiver = null
        }
    }
}

class PassthroughUnavailableException(message: String) :
    CodedException("SERVICE_UNAVAILABLE", message, null)

/**
 * Bridge façade for PXR_Plugin passthrough APIs.
 *
 * SDK surface:
 *   com.pvr.sdk.PXR_Plugin
 *     .UPxr_SetSeeThroughBackground(boolean enable)   → void
 *     .UPxr_SetSeeThroughTransparency(float level)    → void
 *
 * Alternative class names tried in order (SDK version variance).
 */
private object PassthroughBridge {

    private val CLASS_CANDIDATES = arrayOf(
        "com.pvr.sdk.PXR_Plugin",
        "com.picovr.sdk.PXR_Plugin",
        "com.pico.sdk.PXRPlugin",
    )

    private val ENABLE_METHOD_CANDIDATES = arrayOf(
        "UPxr_SetSeeThroughBackground",
        "setSeeThroughBackground",
        "enablePassthrough",
    )

    private val LEVEL_METHOD_CANDIDATES = arrayOf(
        "UPxr_SetSeeThroughTransparency",
        "setSeeThroughTransparency",
        "setPassthroughLevel",
        "setTransparency",
    )

    @Volatile private var sdkClass: Class<*>? = null
    @Volatile private var probed = false
    @Volatile private var available = false

    fun isSdkAvailable(): Boolean {
        if (!probed) probe()
        return available
    }

    private fun probe() {
        synchronized(this) {
            if (probed) return
            for (name in CLASS_CANDIDATES) {
                try {
                    sdkClass = Class.forName(name, false, PassthroughBridge::class.java.classLoader)
                    available = true
                    break
                } catch (_: Throwable) {}
            }
            probed = true
        }
    }

    fun setPassthrough(enabled: Boolean, level: Float) {
        val clazz = sdkClass ?: throw PassthroughUnavailableException("PXR_Plugin class not found")

        var enableOk = false
        for (methodName in ENABLE_METHOD_CANDIDATES) {
            try {
                val m = clazz.getMethod(methodName, Boolean::class.java)
                m.invoke(null, enabled)
                enableOk = true
                break
            } catch (_: NoSuchMethodException) {}
            catch (e: java.lang.reflect.InvocationTargetException) {
                throw PassthroughUnavailableException("$methodName failed: ${e.cause?.message}")
            }
            catch (_: Throwable) {}
        }
        if (!enableOk) throw PassthroughUnavailableException("No enable-passthrough method found in PXR_Plugin")

        if (!enabled) return

        for (methodName in LEVEL_METHOD_CANDIDATES) {
            try {
                val m = clazz.getMethod(methodName, Float::class.java)
                m.invoke(null, level)
                return
            } catch (_: NoSuchMethodException) {}
            catch (_: Throwable) {}
        }
    }
}
