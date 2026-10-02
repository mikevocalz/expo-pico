package expo.modules.pico.rooms

internal object RoomsUtils {
  // PPS 1.0.x has no dedicated rooms client. The legacy PVR
  // `com.pvr.platform.sdk.room.RoomService` is the only thing that
  // would make this available; without that class on the classpath
  // we report unavailable so the JS layer (`isRoomsAvailable`)
  // returns false up-front instead of every call rejecting with
  // NOT_IN_PPS_1_0.
  fun isRoomsSdkAvailable(): Boolean = runCatching {
    Class.forName("com.pvr.platform.sdk.room.RoomService")
  }.isSuccess

  fun getRoomsSdkVersion(): String = if (isRoomsSdkAvailable()) "pvr-legacy" else "unavailable"
}
