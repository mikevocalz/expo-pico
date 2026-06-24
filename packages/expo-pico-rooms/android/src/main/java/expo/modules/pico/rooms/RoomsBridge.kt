package expo.modules.pico.rooms

/**
 * PPS 1.0.x has NO dedicated rooms client (PICO removed PVR Rooms during
 * the PVR→PPS rewrite). The closest available surface is
 * `PicoFriendClient.getFriendsAndRooms()` which returns READ-ONLY data
 * about which rooms your friends are currently in.
 *
 * Apps that need create/join/leave/kick rooms must:
 *   - run their own room state on a backend (Fishjam, Colyseus, etc.), OR
 *   - wait for a future PPS release that re-adds room management.
 *
 * Each function here surfaces an actionable error.
 */
internal object RoomsBridge {

    private fun notInPps(method: String, onError: (String, String) -> Unit) {
        onError(
            "NOT_IN_PPS_1_0",
            "$method is not in PPS 1.0.x. PICO removed dedicated room management " +
            "during the PVR→PPS rewrite. Run room state on a backend " +
            "(Fishjam, Colyseus) or use friend.getFriendsAndRooms() for read-only " +
            "discovery of friends' rooms."
        )
    }

    fun createRoom(
        _joinPolicy: String, _maxMembers: Int, _data: Map<String, String>,
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("createRoom", onError)

    fun joinRoom(
        _roomId: String, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("joinRoom", onError)

    fun leaveRoom(
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("leaveRoom", onError)

    fun getRoomInfo(
        _roomId: String, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("getRoomInfo", onError)

    fun kickUser(
        _userId: String, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("kickUser", onError)

    fun updateRoomData(
        _data: Map<String, String>, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("updateRoomData", onError)
}
