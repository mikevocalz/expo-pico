package expo.modules.pico.subscription

internal object SubscriptionUtils {

  private val SDK_AVAILABLE: Boolean by lazy {
    try {
      Class.forName("com.pvr.platform.sdk.subscription.SubscriptionService")
      true
    } catch (_: ClassNotFoundException) {
      false
    }
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
