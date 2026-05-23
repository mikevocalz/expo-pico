package expo.modules.pico.leaderboards

import expo.modules.pico.PicoPlatformSdkDetector

internal object LeaderboardsUtils {

  private val SDK_AVAILABLE: Boolean by lazy {
    PicoPlatformSdkDetector.probeAny(
      "com.pvr.platform.sdk.leaderboard.LeaderboardAPI",
      "com.pico.pps.sdk.leaderboard.LeaderboardClient",
    )
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
