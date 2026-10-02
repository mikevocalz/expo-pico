package expo.modules.pico.rooms

internal object RoomsUtils {
  // PPS 1.0.x has no room-management service, but IFriendClient exposes the
  // read-only friends-and-rooms discovery feed used by getRoomInfo() and
  // getFriendsAndRooms().
  fun isRoomsSdkAvailable(): Boolean = runCatching {
    Class.forName("com.pico.pps.sdk.friend.PicoFriendClient")
  }.isSuccess

  fun getRoomsSdkVersion(): String = if (isRoomsSdkAvailable()) "1.0.0" else "unavailable"
}
