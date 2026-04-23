package expo.modules.pico.os6

import android.content.Context
import android.util.Log

/**
 * EXTENSION SEAM — PICO OS 6 runtime initialization.
 *
 * Standard PICO OS 6 device initialization. The current public
 * `expo-pico-core` runtime detection module reads device facts from
 * Build.MANUFACTURER / system properties, but this seam exists for code
 * paths that need to actively register with the PICO Platform Service
 * (entitlement checks, identity, IAP, push) at app boot — separate from
 * lazy module initialization triggered on first JS call.
 *
 * The body of [initialize] is a no-op until the corresponding PICO
 * Platform SDK bindings are wrapped in this Expo Module. Sibling packages
 * (`expo-pico-account`, `expo-pico-iap`, etc.) currently perform their
 * own lazy registration; this seam is the future home for any boot-time
 * registration that must happen before the JS runtime starts.
 */
object PicoOs6Runtime {
    private const val TAG = "PicoOs6Runtime"

    @Volatile private var initialized = false

    @JvmStatic
    fun initialize(context: Context) {
        if (initialized) return
        synchronized(this) {
            if (initialized) return
            Log.i(TAG, "PICO OS 6 runtime initialization seam reached.")
            initialized = true
        }
    }

    @JvmStatic
    internal fun resetForTesting() {
        synchronized(this) { initialized = false }
    }

    @JvmStatic
    fun isInitialized(): Boolean = initialized
}
