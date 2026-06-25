package expo.modules.pico.spatial

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Scene mesh / room mesh Expo Module.
 *
 * Exposes `getSceneMesh()` (async one-shot query) and
 * `addSceneMeshUpdateListener` / `removeSceneMeshUpdateListener`
 * for continuous mesh updates.
 *
 * The native payload (List<Float> vertices, List<Int> indices, optional
 * List<Float> normals) is returned directly to JS, where the typed-array
 * wrappers `Float32Array` / `Uint32Array` are constructed from the lists.
 * JS is responsible for the typed-array upgrade because the Expo bridge
 * cannot transmit TypedArrays natively.
 *
 * Emits `onSceneMeshUpdate` when a listener is active.
 */
class ExpoPicoSceneMeshModule : Module() {

    private var listenerCount = 0
    private var hostPaused = false

    override fun definition() = ModuleDefinition {
        Name("ExpoPicoSceneMesh")

        Constants(
            "sceneMeshAvailable" to SceneMeshBridge.isSdkAvailable()
        )

        Events("onSceneMeshUpdate")

        OnStartObserving {
            listenerCount++
        }

        OnStopObserving {
            listenerCount = maxOf(0, listenerCount - 1)
        }

        AsyncFunction("getSceneMesh") {
            if (!SceneMeshBridge.isSdkAvailable()) {
                throw ServiceUnavailableMeshException("Scene mesh SDK not available on this device or build")
            }
            SceneMeshBridge.getSceneMesh()
                ?: throw ServiceUnavailableMeshException("Scene mesh query returned null — SDK may not be initialized")
        }

        Function("isSceneMeshAvailable") {
            SceneMeshBridge.isSdkAvailable()
        }

        OnActivityEntersForeground {
            hostPaused = false
        }

        OnActivityEntersBackground {
            hostPaused = true
        }

        OnDestroy {
            listenerCount = 0
        }
    }
}

class ServiceUnavailableMeshException(message: String) :
    CodedException("SERVICE_UNAVAILABLE", message, null)
