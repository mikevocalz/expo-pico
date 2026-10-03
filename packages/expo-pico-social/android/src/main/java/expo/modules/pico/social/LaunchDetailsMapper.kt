package expo.modules.pico.social

/**
 * Converts a PPS 1.0 `com.pico.pps.sdk.social.LaunchDetails` into the
 * `PicoLaunchDetails` shape JS expects. Read reflectively because the social
 * AAR is `compileOnly` and absent on the mobile flavor.
 *
 * Getter names come from `javap` on platform-service-social-1.0.0:
 * getLaunchResult, getLaunchType, getLaunchSource, getDeepLinkMessage,
 * getDestinationApiName, getTrackingID, getLobbySessionID, getMatchSessionID,
 * getExtra, getClientAction.
 */
internal object LaunchDetailsMapper {
  /** What JS sees when PPS is absent or has no launch intent to report. */
  val NORMAL_LAUNCH: Map<String, Any?> = mapOf(
    "launchType" to "normal",
    "launchResult" to "unknown",
    "launchSource" to "",
    "deepLinkMessage" to "",
    "destinationApiName" to "",
    "trackingId" to "",
    "lobbySessionId" to "",
    "matchSessionId" to "",
    "extra" to "",
    "clientAction" to "",
  )

  fun toMap(details: Any): Map<String, Any?> {
    return mapOf(
      "launchType" to launchType(enumName(details, "getLaunchType")),
      "launchResult" to launchResult(enumName(details, "getLaunchResult")),
      "launchSource" to string(details, "getLaunchSource"),
      "deepLinkMessage" to string(details, "getDeepLinkMessage"),
      "destinationApiName" to string(details, "getDestinationApiName"),
      "trackingId" to string(details, "getTrackingID"),
      "lobbySessionId" to string(details, "getLobbySessionID"),
      "matchSessionId" to string(details, "getMatchSessionID"),
      "extra" to string(details, "getExtra"),
      "clientAction" to string(details, "getClientAction"),
    )
  }

  // PPS LaunchType: UNKNOWN, NORMAL, INVITE, COORDINATED, DEEPLINK.
  private fun launchType(name: String?): String {
    return when (name) {
      "NORMAL" -> "normal"
      "INVITE" -> "invite"
      "COORDINATED" -> "coordinated"
      "DEEPLINK" -> "deeplink"
      else -> "unknown"
    }
  }

  // PPS LaunchResult: UNKNOWN, SUCCESS, FAILED_ROOM_FULL,
  // FAILED_GAME_ALREADY_STARTED, FAILED_ROOM_NOT_FOUND, FAILED_USER_DECLINED,
  // FAILED_OTHER_REASON.
  private fun launchResult(name: String?): String {
    return when (name) {
      "SUCCESS" -> "success"
      "FAILED_ROOM_FULL" -> "failed-room-full"
      "FAILED_GAME_ALREADY_STARTED" -> "failed-game-already-started"
      "FAILED_ROOM_NOT_FOUND" -> "failed-room-not-found"
      "FAILED_USER_DECLINED" -> "failed-user-declined"
      "FAILED_OTHER_REASON" -> "failed-other"
      else -> "unknown"
    }
  }

  private fun enumName(target: Any, getter: String): String? {
    val value = invoke(target, getter) ?: return null
    return (value as? Enum<*>)?.name ?: value.toString()
  }

  private fun string(target: Any, getter: String): String {
    return invoke(target, getter)?.toString().orEmpty()
  }

  private fun invoke(target: Any, getter: String): Any? {
    try {
      return target.javaClass.getMethod(getter).invoke(target)
    } catch (_: Throwable) {
      return null
    }
  }
}
