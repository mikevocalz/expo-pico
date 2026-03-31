package expo.modules.pico.leaderboards

internal object LeaderboardsUtils {

  private val SDK_AVAILABLE: Boolean by lazy {
    try {
      Class.forName("com.pvr.platform.sdk.leaderboard.LeaderboardAPI")
      true
    } catch (_: ClassNotFoundException) {
      false
    }
  }

  fun isLeaderboardsSdkAvailable(): Boolean = SDK_AVAILABLE

  fun getLeaderboardsSdkVersion(): String {
    if (!SDK_AVAILABLE) return "unavailable"
    return runCatching {
      Class.forName("com.pvr.platform.sdk.BuildConfig")
        .getField("VERSION_NAME")
        .get(null) as? String ?: "unknown"
    }.getOrDefault("unknown")
  }
}
