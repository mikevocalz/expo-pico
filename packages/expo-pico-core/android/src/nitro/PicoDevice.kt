package com.margelo.nitro.expopico.picocore

import android.content.Context
import com.margelo.nitro.NitroModules
import expo.modules.pico.BuildConfig

/**
 * Device and build facts shared by this package's two HybridObjects.
 *
 * Everything here is read from one of three places, in descending order of
 * trust:
 *
 * 1. `BuildConfig` — written at prebuild time by the `withPicoGradle`
 *    config plugin from the app's plugin options. This is what the
 *    developer declared.
 * 2. `PackageManager` — what the device actually reports. This is what is
 *    really there.
 * 3. `Class.forName` — whether an SDK is linked into this build.
 *
 * The distinction matters: `declaredCapabilities` is (1), a capability
 * snapshot joins (1) against (2) and (3), and confusing them is how an app
 * ends up calling an API the headset does not have.
 */
internal object PicoDevice {

  fun context(): Context? = NitroModules.applicationContext

  /**
   * Whether this build was configured for PICO at all.
   *
   * `xrMode` is the switch the plugin sets; `mobile` means the developer
   * asked for a phone/tablet build and no PICO surface should claim to
   * work, whatever hardware it happens to be running on.
   */
  val isPicoBuild: Boolean
    get() = BuildConfig.PICO_XR_MODE != "mobile"

  /**
   * Whether the hardware underneath is really a PICO headset.
   *
   * Checked against the PICO system feature rather than the manufacturer
   * string: `Build.MANUFACTURER` is "Pico" on retail units but the
   * emulator and some dev images report otherwise, while the feature is
   * declared by PICO OS itself.
   */
  val isPicoDevice: Boolean
    get() {
      val pm = context()?.packageManager ?: return false
      return PICO_DEVICE_FEATURES.any { runCatching { pm.hasSystemFeature(it) }.getOrDefault(false) }
    }

  /** `true` when [className] is on this build's runtime classpath. */
  fun classPresent(className: String): Boolean =
    runCatching { Class.forName(className); true }.getOrDefault(false)

  /**
   * The PICO Platform SDK — the older `com.pico.loginpaysdk` family that
   * ships as a vendored AAR, not the Maven-resolved Platform *Service*
   * SDK. Two different things with confusingly similar names.
   */
  val platformSdkPresent: Boolean
    get() = PLATFORM_SDK_PROBES.values.any { classPresent(it) }

  /** Probe results keyed by a stable name, for `getPlatformSdkProbe()`. */
  fun platformSdkProbe(): Map<String, Boolean> =
    PLATFORM_SDK_PROBES.mapValues { (_, className) -> classPresent(className) }

  /**
   * Split a comma-separated BuildConfig string.
   *
   * The plugin joins list options with commas; an unset option is the
   * empty string, which must yield an empty list rather than a list
   * containing one empty entry.
   */
  fun splitList(value: String): List<String> =
    value.split(',').map { it.trim() }.filter { it.isNotEmpty() }

  /**
   * PICO system features, newest namespace first. PICO OS 6 declares
   * `com.pico.*`; older images predate that migration and use `picovr`.
   */
  private val PICO_DEVICE_FEATURES = listOf(
    "com.pico.device",
    "picovr.software.vr_mode",
  )

  private val PLATFORM_SDK_PROBES = mapOf(
    "loginPaySdk" to "com.pico.loginpaysdk.UnityAuthInterface",
    "browser" to "com.pico.loginpaysdk.component.PicoSDKBrowser",
    "pxrPlugin" to "com.picovr.picovrlib.PXR_Plugin",
  )
}
