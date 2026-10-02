package expo.modules.pico.social

import expo.modules.pico.PicoPlatformSdkDetector

internal object SocialUtils {
  private val SDK_AVAILABLE: Boolean by lazy {
    PicoPlatformSdkDetector.probeAny(
      "com.pvr.platform.sdk.social.FriendsAPI",
      "com.pico.pps.sdk.social.PicoSocialClient",
    ) || PicoPlatformSdkDetector.isAnyPlatformSdkPresent()
  }

  fun isSocialSdkAvailable(): Boolean = SDK_AVAILABLE

  fun getSocialSdkVersion(): String {
    if (!SDK_AVAILABLE) return "unavailable"
    return try {
      Class.forName("com.pvr.platform.sdk.BuildConfig")
        .getField("SOCIAL_SDK_VERSION")
        .get(null) as? String ?: "unknown"
    } catch (_: Exception) {
      "unknown"
    }
  }
}
