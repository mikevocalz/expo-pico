package expo.modules.pico.rooms

import expo.modules.pico.PicoPlatformSdkDetector

internal object RoomsUtils {

  // PPS 1.0.1-alpha.13 ships friend/rooms as
  // `com.bytedance.pico.matrix.action.FriendAction` — confirmed by
  // dumping platform-service-friend's classes.jar. No dedicated
  // `PicoFriendClient` class exists yet, so include the Action class
  // in the probe set.
  private val SDK_AVAILABLE: Boolean by lazy {
    PicoPlatformSdkDetector.probeAny(
      "com.pvr.platform.sdk.room.RoomService",
      "com.pico.pps.sdk.friend.PicoFriendClient",
      "com.bytedance.pico.matrix.action.FriendAction",
    ) || PicoPlatformSdkDetector.isAnyPlatformSdkPresent()
  }

  fun isRoomsSdkAvailable(): Boolean = SDK_AVAILABLE

  fun getRoomsSdkVersion(): String {
    if (!SDK_AVAILABLE) return "unavailable"
    return runCatching {
      Class.forName("com.pvr.platform.sdk.BuildConfig")
        .getField("VERSION_NAME")
        .get(null) as? String ?: "unknown"
    }.getOrDefault("unknown")
  }
}
