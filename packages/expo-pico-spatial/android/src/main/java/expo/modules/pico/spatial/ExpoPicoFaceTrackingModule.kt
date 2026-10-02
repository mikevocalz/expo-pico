package expo.modules.pico.spatial

import android.os.Handler
import android.os.Looper
import android.view.Choreographer
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Face tracking Expo Module.
 *
 * Emits `onFaceUpdate` with a blendshape map at vsync frequency while
 * at least one JS listener is active. Polling pauses on host pause
 * and is cleaned up on destroy.
 *
 * Event payload shape:
 *   Record<string, number>  — blendshape name → weight (0.0 – 1.0)
 *
 * Unsupported devices reject with SERVICE_UNAVAILABLE.
 */
class ExpoPicoFaceTrackingModule : Module() {

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
            val shapes = FaceTrackingBridge.getBlendShapes()
            if (shapes != null && shapes.isNotEmpty()) {
                sendEvent("onFaceUpdate", shapes)
            }
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    override fun definition() = ModuleDefinition {
        Name("ExpoPicoFaceTracking")

        Constants(
            "faceTrackingAvailable" to FaceTrackingBridge.isSdkAvailable()
        )

        Events("onFaceUpdate")

        OnStartObserving {
            if (!FaceTrackingBridge.isSdkAvailable()) return@OnStartObserving
            listenerCount++
            startPollingIfNeeded()
        }

        OnStopObserving {
            listenerCount = maxOf(0, listenerCount - 1)
        }

        Function("isFaceTrackingAvailable") {
            FaceTrackingBridge.isSdkAvailable()
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
        if (choreographerActive || !FaceTrackingBridge.isSdkAvailable()) return
        choreographerActive = true
        mainHandler.post {
            Choreographer.getInstance().postFrameCallback(frameCallback)
        }
    }
}

class ServiceUnavailableFaceException(message: String) :
    CodedException("SERVICE_UNAVAILABLE", message, null)
