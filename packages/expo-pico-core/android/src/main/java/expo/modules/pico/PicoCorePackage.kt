package expo.modules.pico

import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import expo.modules.pico.os6.PicoOs6Runtime
import expo.modules.pico.swan.PicoSwanRuntime

/**
 * PICO core React Native package.
 *
 * Mirrors the Viro `ReactViroPackage(ViroPlatform)` pattern: a single
 * registration class that takes a platform enum and dispatches to a
 * platform-specific runtime initializer.
 *
 * Two important differences from Viro's package:
 *   1. **Single registration per app, not one per mode.** Viro registers
 *      one package per active xRMode entry (so OVR_MOBILE + GVR registers
 *      two packages). PICO Swan and PICO OS 6 are mutually exclusive at
 *      boot (an app picks one runtime), so this class is constructed at
 *      most once.
 *   2. **Empty native module list.** All Expo-style modules are auto-
 *      registered via `expo-module.config.json`. This package exists for
 *      its constructor side-effect — running platform-specific runtime
 *      initialization seams — and for surfacing the active platform via
 *      [getActivePlatform] at runtime.
 *
 * If no value is passed, the platform is read from
 * `BuildConfig.PICO_XR_MODE` (written by the expo-pico-core config plugin).
 *
 * @param platform Active PICO XR platform mode. Defaults to the value
 *                 written into BuildConfig by the config plugin.
 */
class PicoCorePackage @JvmOverloads constructor(
    private val platform: PicoXRPlatform = PicoXRPlatform.fromBuildConfig()
) : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        Log.i(TAG, "PicoCorePackage initialized with platform=$platform")
        when (platform) {
            PicoXRPlatform.PICO_SWAN -> PicoSwanRuntime.initialize(reactContext)
            PicoXRPlatform.PICO_OS6 -> PicoOs6Runtime.initialize(reactContext)
            PicoXRPlatform.MOBILE -> { /* no runtime init for mobile */ }
        }
        return emptyList()
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }

    /**
     * Returns the platform mode the package was constructed with. Useful
     * for app code that wants to assert at boot that the expected runtime
     * is active without round-tripping through JS.
     */
    fun getActivePlatform(): PicoXRPlatform = platform

    companion object {
        private const val TAG = "PicoCorePackage"
    }
}
