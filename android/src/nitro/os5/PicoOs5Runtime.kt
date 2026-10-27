package expo.modules.pico.os5

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * PICO OS 5 / PVR runtime boot-time initialization. Used by PICO 4
 * and PICO 4 Ultra. (Swan / PICO OS 6 goes through [PicoSwanRuntime].)
 *
 * Currently does two jobs:
 *   1. Marks the runtime as initialized so JS can read
 *      [isInitialized] for diagnostics.
 *   2. Installs the **Choreographer NPE guard** — a workaround for a
 *      known PICO OS 5 / Android 14 vsync race where `VsyncEventData`
 *      arrives null and `Choreographer$FrameData.update` throws an NPE
 *      on `frameTimelinesLength`, killing the main thread.
 *
 *      The handler runs *before* the JVM unwinds the main thread;
 *      re-entering `Looper.loop()` keeps the app alive. The crash is
 *      benign (just a vsync timeline read), so swallowing it is safe.
 *      Remove when PICO OS ships the fixed Choreographer.
 */
object PicoOs5Runtime {
    private const val TAG = "PicoOs5Runtime"

    @Volatile private var initialized = false

    @JvmStatic
    fun initialize(context: Context) {
        if (initialized) return
        synchronized(this) {
            if (initialized) return
            installChoreographerNpeGuard()
            Log.i(TAG, "PICO OS 5 runtime initialized; Choreographer NPE guard installed.")
            initialized = true
        }
    }

    private fun installChoreographerNpeGuard() {
        Handler(Looper.getMainLooper()).post {
            val defaultHandler = Thread.currentThread().uncaughtExceptionHandler
            Thread.currentThread().setUncaughtExceptionHandler { t, e ->
                val isFrameTimelineNpe = e is NullPointerException &&
                    e.message?.contains("frameTimelinesLength") == true
                if (!isFrameTimelineNpe) {
                    defaultHandler?.uncaughtException(t, e)
                    return@setUncaughtExceptionHandler
                }
                Log.w(TAG, "Swallowed Choreographer frameTimelinesLength NPE (PICO OS 5 vsync race)", e)
                try { Looper.loop() } catch (re: Throwable) {
                    defaultHandler?.uncaughtException(t, re)
                }
            }
        }
    }

    @JvmStatic
    internal fun resetForTesting() {
        synchronized(this) { initialized = false }
    }

    @JvmStatic
    fun isInitialized(): Boolean = initialized
}
