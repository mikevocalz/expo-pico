package expo.modules.pico

import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import expo.modules.pico.os5.PicoOs5Runtime
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
        // Lets core reach the resumed Activity; see PicoActivityHolder.
        PicoActivityHolder.attach(reactContext)
        loadNitroModules()
        when (platform) {
            PicoXRPlatform.PICO_SWAN -> PicoSwanRuntime.initialize(reactContext)
            PicoXRPlatform.PICO_OS5 -> PicoOs5Runtime.initialize(reactContext)
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

    /**
     * Load the Nitro C++ library for every installed `@expo-pico` package.
     *
     * Nitrogen generates an `<Name>OnLoad.initializeNative()` per package which
     * `System.loadLibrary`s that package's `.so`; the library's `JNI_OnLoad`
     * then calls `registerAllNatives()` and the HybridObjects become
     * resolvable. Nothing called any of the twelve, so every library stayed
     * unloaded, `NitroModules.createHybridObject("PicoCore")` threw,
     * `resolveHybridObject` swallowed it, and the family reported its
     * native-absent defaults on real hardware — xrMode 'mobile', appType '2d',
     * platformSdkPresent false.
     *
     * Reflection rather than direct calls because siblings are optional: an app
     * installing only `@expo-pico/core` must not fail to boot because
     * `@expo-pico/social` is absent. ClassNotFoundException is the expected
     * outcome for a package that is not installed, so it is not logged;
     * anything else is, because a present-but-unloadable library is a real
     * problem worth seeing.
     *
     * `initializeNative()` is idempotent, so repeated calls are harmless.
     */
    private fun loadNitroModules() {
        for (className in NITRO_ONLOAD_CLASSES) {
            try {
                Class.forName(className).getMethod("initializeNative").invoke(null)
            } catch (_: ClassNotFoundException) {
                // Package not installed in this app. Expected.
            } catch (t: Throwable) {
                Log.e(TAG, "Failed to initialize Nitro module $className", t)
            }
        }
    }

    companion object {
        private const val TAG = "PicoCorePackage"

        /**
         * Nitrogen OnLoad classes, one per package shipping a Nitro module.
         * Kept in step with `PICO_NATIVE_PACKAGES` in
         * `plugin/src/withPicoNitroModules.ts`.
         */
        private val NITRO_ONLOAD_CLASSES = listOf(
            "com.margelo.nitro.expopico.picocore.ExpoPicoCoreOnLoad",
            "com.margelo.nitro.expopico.account.ExpoPicoAccountOnLoad",
            "com.margelo.nitro.expopico.achievements.ExpoPicoAchievementsOnLoad",
            "com.margelo.nitro.expopico.iap.ExpoPicoIapOnLoad",
            "com.margelo.nitro.expopico.leaderboards.ExpoPicoLeaderboardsOnLoad",
            "com.margelo.nitro.expopico.notifications.ExpoPicoNotificationsOnLoad",
            "com.margelo.nitro.expopico.rooms.ExpoPicoRoomsOnLoad",
            "com.margelo.nitro.expopico.rtc.ExpoPicoRtcOnLoad",
            "com.margelo.nitro.expopico.social.ExpoPicoSocialOnLoad",
            "com.margelo.nitro.expopico.spatial.ExpoPicoSpatialOnLoad",
            "com.margelo.nitro.expopico.storage.ExpoPicoStorageOnLoad",
            "com.margelo.nitro.expopico.subscription.ExpoPicoSubscriptionOnLoad",
        )
    }
}
