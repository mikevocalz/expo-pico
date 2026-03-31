package expo.modules.pico.achievements

internal object AchievementsUtils {

  private val SDK_AVAILABLE: Boolean by lazy {
    try {
      Class.forName("com.pvr.platform.sdk.achievements.AchievementsAPI")
      true
    } catch (_: ClassNotFoundException) {
      false
    }
  }

  fun isAchievementsSdkAvailable(): Boolean = SDK_AVAILABLE

  fun getAchievementsSdkVersion(): String {
    if (!SDK_AVAILABLE) return "unavailable"
    return runCatching {
      Class.forName("com.pvr.platform.sdk.BuildConfig")
        .getField("VERSION_NAME")
        .get(null) as? String ?: "unknown"
    }.getOrDefault("unknown")
  }
}
