package expo.modules.pico.rooms

internal object RoomsUtils {

  private val SDK_AVAILABLE: Boolean by lazy {
    try {
      Class.forName("com.pvr.platform.sdk.room.RoomService")
      true
    } catch (_: ClassNotFoundException) {
      false
    }
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
