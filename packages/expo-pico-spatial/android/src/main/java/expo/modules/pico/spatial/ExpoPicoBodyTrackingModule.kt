package expo.modules.pico.spatial

import android.os.Handler
import android.os.Looper
import android.view.Choreographer
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Body tracking Expo Module.
 *
 * Emits `onBodyUpdate` with a joint array at vsync frequency while at
 * least one JS listener is active. Pauses on host pause, cleaned up
 * on destroy.
 *
 * Event payload shape:
 *   Array of { name: string; position: [x,y,z]; rotation: [x,y,z,w] }
 *
 * Unsupported runtimes reject with SERVICE_UNAVAILABLE.
 */
class ExpoPicoBodyTrackingModule : Module() {

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
            val joints = BodyTrackingBridge.getBodyJoints()
            if (joints != null) {
                sendEvent("onBodyUpdate", mapOf("joints" to joints))
            }
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    override fun definition() = ModuleDefinition {
        Name("ExpoPicoBodyTracking")

        Constants(
            "bodyTrackingAvailable" to BodyTrackingBridge.isSdkAvailable()
        )

        Events("onBodyUpdate")

        OnStartObserving {
            if (!BodyTrackingBridge.isSdkAvailable()) return@OnStartObserving
            listenerCount++
            startPollingIfNeeded()
        }

        OnStopObserving {
            listenerCount = maxOf(0, listenerCount - 1)
        }

        Function("isBodyTrackingAvailable") {
            BodyTrackingBridge.isSdkAvailable()
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
        if (choreographerActive || !BodyTrackingBridge.isSdkAvailable()) return
        choreographerActive = true
        mainHandler.post {
            Choreographer.getInstance().postFrameCallback(frameCallback)
        }
    }
}

class ServiceUnavailableBodyException(message: String) :
    CodedException("SERVICE_UNAVAILABLE", message, null)
