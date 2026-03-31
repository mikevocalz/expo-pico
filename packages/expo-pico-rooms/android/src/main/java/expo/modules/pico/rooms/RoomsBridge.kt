package expo.modules.pico.rooms

/**
 * RoomsBridge isolates all PICO Platform SDK room/matchmaking calls.
 *
 * Architecture:
 * - ExpoPicoRoomsModule holds all Expo Module DSL wiring and local atomic state.
 * - RoomsBridge holds all SDK boundary logic. It never imports Expo Module types.
 * - When the SDK AAR is available, replace each TODO(pico-sdk) block only in this file.
 *   The module, TypeScript layer, and tests require no changes.
 *
 * Threading:
 * - All functions are called from AsyncFunction background threads (Expo Modules default).
 * - SDK callbacks may arrive on a different thread — onSuccess/onError lambdas are
 *   thread-safe by design (they call promise.resolve/reject which is thread-safe).
 * - moduleRef is used for push events only; access it on the SDK callback thread is safe
 *   because sendEvent() is internally thread-safe in Expo Modules.
 *
 * See: https://developer.picoxr.com/document/unity/room-matchmaking/
 */
internal object RoomsBridge {

  /**
   * Weak reference to the module instance for push-event forwarding.
   * Set by ExpoPicoRoomsModule when the module is created.
   */
  @Volatile
  var moduleRef: ExpoPicoRoomsModule? = null

  fun createRoom(
    joinPolicy: String,
    maxMembers: Int,
    data: Map<String, String>,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): Replace with real SDK call:
    //   RoomService.createRoom(
    //     RoomJoinPolicy.fromString(joinPolicy),
    //     maxMembers,
    //     data
    //   ) { result ->
    //     if (result.isSuccess) onSuccess(result.room.toMap())
    //     else onError("NETWORK_ERROR", result.errorMessage ?: "createRoom failed")
    //   }
    onError("NOT_IMPLEMENTED", "createRoom: Rooms SDK not yet linked. Add PICO Platform SDK AAR.")
  }

  fun joinRoom(
    roomId: String,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): RoomService.joinRoom(roomId) { result -> ... }
    onError("NOT_IMPLEMENTED", "joinRoom: Rooms SDK not yet linked.")
  }

  fun leaveRoom(
    onSuccess: () -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): RoomService.leaveRoom { result -> ... }
    onError("NOT_IMPLEMENTED", "leaveRoom: Rooms SDK not yet linked.")
  }

  fun getRoomInfo(
    roomId: String,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): RoomService.getRoomInfo(roomId) { result -> ... }
    onError("NOT_IMPLEMENTED", "getRoomInfo: Rooms SDK not yet linked.")
  }

  fun kickUser(
    userId: String,
    onSuccess: () -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): RoomService.kickUser(userId) { result -> ... }
    onError("NOT_IMPLEMENTED", "kickUser: Rooms SDK not yet linked.")
  }

  fun updateRoomData(
    data: Map<String, String>,
    onSuccess: () -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): RoomService.updateRoomCustomData(data) { result -> ... }
    onError("NOT_IMPLEMENTED", "updateRoomData: Rooms SDK not yet linked.")
  }
}
