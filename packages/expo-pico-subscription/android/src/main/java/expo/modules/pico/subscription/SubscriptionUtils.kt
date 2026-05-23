package expo.modules.pico.subscription

import expo.modules.pico.PicoPlatformSdkDetector

internal object SubscriptionUtils {

  private val SDK_AVAILABLE: Boolean by lazy {
    PicoPlatformSdkDetector.probeAny(
      "com.pvr.platform.sdk.subscription.SubscriptionService",
      "com.pico.pps.sdk.subscription.PicoSubscriptionClient",
    )
  }

  fun isSubscriptionSdkAvailable(): Boolean = SDK_AVAILABLE

  fun getSubscriptionSdkVersion(): String {
    if (!SDK_AVAILABLE) return "unavailable"
    return runCatching {
      Class.forName("com.pvr.platform.sdk.BuildConfig")
        .getField("VERSION_NAME")
        .get(null) as? String ?: "unknown"
    }.getOrDefault("unknown")
  }
}
