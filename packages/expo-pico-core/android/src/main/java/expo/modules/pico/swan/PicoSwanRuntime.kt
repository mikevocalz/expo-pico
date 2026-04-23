package expo.modules.pico.swan

import android.content.Context
import android.util.Log

/**
 * EXTENSION SEAM — PICO Swan OS / Project Swan runtime initialization.
 *
 * Public PICO documentation does not describe a fixed initialization
 * contract for Swan-targeted Android apps as of this writing. The
 * expected shape, based on the published PICO Spatial SDK pattern at
 * https://developer.picoxr.com/document/spatial-sdk/, is for the app to:
 *
 *   1. Register an entitlement check with the PICO Platform Service.
 *   2. Register a spatial-container provider with the PICO OS spatial layer
 *      (so the OS knows whether the app is a `window-container` or `stage`
 *      app).
 *   3. Opt into Swan-specific spatial mesh / anchor providers if scene-
 *      understanding or anchor-persistence are declared in the manifest.
 *
 * When the public Swan SDK ships, replace the body of [initialize] with
 * the real binding calls. Until then this is a documented seam that
 * proves the platform-mode plumbing works end-to-end without inventing
 * fake API calls. A no-op here is the correct behavior for SDK-absent
 * builds — the surrounding manifest meta-data and BuildConfig fields are
 * sufficient for the PICO OS launcher to recognize the app as Swan-aware.
 */
object PicoSwanRuntime {
    private const val TAG = "PicoSwanRuntime"

    @Volatile private var initialized = false

    /**
     * Initialize Swan runtime providers. Idempotent and thread-safe.
     * Safe to call from any context — it does nothing on non-Swan
     * devices and on emulator builds with `enableEmulatorOptimizations`.
     */
    @JvmStatic
    fun initialize(context: Context) {
        if (initialized) return
        synchronized(this) {
            if (initialized) return
            Log.i(
                TAG,
                "PICO Swan runtime initialization seam reached. " +
                    "Replace this with PICO Spatial SDK calls when the SDK is available."
            )
            // Extension seam:
            //   PvrSwanRuntime.bind(context.applicationContext)
            //   PvrSpatialContainer.register(context.applicationContext, ...)
            //   PvrEntitlement.checkAsync(context.applicationContext) { ... }
            initialized = true
        }
    }

    /** Test-visible reset for unit tests. Not part of the public contract. */
    @JvmStatic
    internal fun resetForTesting() {
        synchronized(this) { initialized = false }
    }

    @JvmStatic
    fun isInitialized(): Boolean = initialized
}
