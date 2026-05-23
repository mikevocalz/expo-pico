package expo.modules.pico.spatial

import android.os.Handler
import android.os.Looper
import android.view.Choreographer
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Phase K — Eye gaze Expo Module.
 *
 * Emits `onGazeUpdate` events at display vsync frequency while at least
 * one JS listener is active. Uses Choreographer.FrameCallback so gaze
 * samples are frame-synchronised. Polling pauses on host pause and
 * resumes only if listeners remain. Cleaned up on destroy.
 *
 * Event payload shape:
 *   position:  { x, y, z }  — gaze origin in world space (metres)
 *   direction: { x, y, z }  — unit gaze direction vector
 *   valid:     Boolean       — false when tracking is lost
 */
class ExpoPicoEyeGazeModule : Module() {

    private val mainHandler = Handler(Looper.getMainLooper())
    private var listenerCount = 0
    private var choreographerActive = false
    private var hostPaused = false

    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (listenerCount <= 0 || hostPaused) {
                choreographerActive = false
                return
            }
            val pose = EyeGazeBridge.readGazePose()
            if (pose != null) {
                sendEvent("onGazeUpdate", pose)
            }
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    override fun definition() = ModuleDefinition {
        Name("ExpoPicoEyeGaze")

        Constants(
            "eyeGazeAvailable" to EyeGazeBridge.isSdkAvailable()
        )

        Events("onGazeUpdate")

        OnStartObserving {
            listenerCount++
            startPollingIfNeeded()
        }

        OnStopObserving {
            listenerCount = maxOf(0, listenerCount - 1)
        }

        AsyncFunction("getGazeSnapshot") {
            if (!EyeGazeBridge.isSdkAvailable()) {
                throw ServiceUnavailableEyeGazeException("Eye gaze SDK not available on this device or build")
            }
            EyeGazeBridge.getGazeSnapshot()
        }

        Function("isEyeGazeAvailable") {
            EyeGazeBridge.isSdkAvailable()
        }

        OnActivityEntersForeground {
            hostPaused = false
            if (listenerCount > 0) startPollingIfNeeded()
        }

        OnActivityEntersBackground {
            hostPaused = true
        }

        OnDestroy {
            listenerCount = 0
            choreographerActive = false
        }
    }

    private fun startPollingIfNeeded() {
        if (choreographerActive || !EyeGazeBridge.isSdkAvailable()) return
        choreographerActive = true
        mainHandler.post {
            Choreographer.getInstance().postFrameCallback(frameCallback)
        }
    }
}

class ServiceUnavailableEyeGazeException(message: String) :
    CodedException("SERVICE_UNAVAILABLE", message, null)
