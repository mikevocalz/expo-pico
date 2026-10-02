package expo.modules.pico.rooms

import com.pico.pps.sdk.base.MatrixResult
import com.pico.pps.sdk.base.OnCancelListener
import com.pico.pps.sdk.base.OnFailureListener
import com.pico.pps.sdk.base.OnSuccessListener
import com.pico.pps.sdk.base.Task
import com.pico.pps.sdk.friend.IFriendClient
import com.pico.pps.sdk.friend.PicoFriendClient
import expo.modules.pico.PicoAppContext

/**
 * PPS 1.0.x has no room-management client. The only real room surface is the
 * read-only friends-and-rooms discovery feed.
 */
internal object RoomsBridge {
    private fun client(): IFriendClient? {
        val context = PicoAppContext.get() ?: return null
        return runCatching { PicoFriendClient.getFriendClient(context) }.getOrNull()
    }

    private fun <T, R> Task<T>.bridge(
        label: String,
        onSuccess: (R) -> Unit,
        onError: (String, String) -> Unit,
        transform: (T) -> R,
    ) {
        addOnSuccessListener(object : OnSuccessListener<T> {
            override fun onSuccess(result: MatrixResult<T>) {
                if (!result.isSuccess()) {
                    val info = result.errorInfo
                    onError(info?.errorCode?.toString() ?: "PPS_ERROR", info?.errorMsg ?: "$label failed")
                    return
                }
                val data = result.data ?: return onError("EMPTY_RESULT", "$label returned no data")
                runCatching { transform(data) }
                    .onSuccess(onSuccess)
                    .onFailure { onError("PPS_BRIDGE_ERROR", it.message ?: "$label failed") }
            }
        })
        addOnFailureListener(object : OnFailureListener {
            override fun onFailure(e: Exception) = onError("PPS_FAILURE", e.message ?: "$label failed")
        })
        addOnCancelListener(object : OnCancelListener {
            override fun onCancel() = onError("CANCELLED", "$label was cancelled")
        })
    }

    private fun joinPolicy(value: Int?): String = when (value) {
        0 -> "everyone"
        1 -> "friends-only"
        else -> "invite-only"
    }

    private fun roomMap(roomId: String, entries: List<Any>): Map<String, Any?> {
        // This helper is not used for typed PPS beans because their generated
        // class names are intentionally kept inferred inside the bridge lambdas.
        return mapOf("roomId" to roomId, "memberCount" to entries.size)
    }

    fun getRoomInfo(
        roomId: String,
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val friend = client() ?: return onError("SERVICE_UNAVAILABLE", "PPS friend service unavailable")
        @Suppress("DEPRECATION")
        friend.getFriendsAndRooms().bridge("getRoomInfo", onSuccess, onError) { response ->
            val entries = response.userAndRoomList.orEmpty()
                .filter { it.roomInfo?.id?.toString() == roomId }
            val room = entries.firstOrNull()?.roomInfo
                ?: throw NoSuchElementException("ROOM_NOT_FOUND: no friend is currently in room '$roomId'")
            mapOf(
                "roomId" to room.id?.toString().orEmpty(),
                "name" to room.name,
                "joinPolicy" to joinPolicy(room.joinPolicy),
                "memberCount" to entries.size,
                "maxMembers" to (room.maxUser ?: 0),
                "data" to emptyMap<String, String>(),
                "members" to entries.mapNotNull { entry ->
                    val user = entry.userInfo ?: return@mapNotNull null
                    mapOf(
                        "userId" to user.openUid.orEmpty(),
                        "displayName" to user.displayName.orEmpty(),
                        "role" to "member",
                        "isPresent" to true,
                    )
                },
            )
        }
    }

    fun getFriendsAndRooms(
        onSuccess: (List<Map<String, Any?>>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val friend = client() ?: return onError("SERVICE_UNAVAILABLE", "PPS friend service unavailable")
        @Suppress("DEPRECATION")
        friend.getFriendsAndRooms().bridge("getFriendsAndRooms", onSuccess, onError) { response ->
            response.userAndRoomList.orEmpty()
                .filter { it.roomInfo != null }
                .groupBy { it.roomInfo?.id?.toString().orEmpty() }
                .mapNotNull { (roomId, entries) ->
                    val room = entries.firstOrNull()?.roomInfo ?: return@mapNotNull null
                    mapOf(
                        "roomId" to roomId,
                        "name" to room.name,
                        "joinPolicy" to joinPolicy(room.joinPolicy),
                        "memberCount" to entries.size,
                        "maxMembers" to (room.maxUser ?: 0),
                        "data" to emptyMap<String, String>(),
                        "members" to entries.mapNotNull { entry ->
                            val user = entry.userInfo ?: return@mapNotNull null
                            mapOf(
                                "userId" to user.openUid.orEmpty(),
                                "displayName" to user.displayName.orEmpty(),
                                "role" to "member",
                                "isPresent" to true,
                            )
                        },
                    )
                }
        }
    }

    private fun notInPps(method: String, onError: (String, String) -> Unit) {
        onError(
            "NOT_IN_PPS_1_0",
            "$method is not in PPS 1.0.x. PICO only exposes the read-only friends-and-rooms feed."
        )
    }

    fun createRoom(
        _joinPolicy: String, _maxMembers: Int, _data: Map<String, String>,
        _onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("createRoom", onError)

    fun joinRoom(
        _roomId: String, _onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("joinRoom", onError)

    fun leaveRoom(
        _onSuccess: () -> Unit, onError: (String, String) -> Unit
    ) = notInPps("leaveRoom", onError)

    fun kickUser(
        _userId: String, _onSuccess: () -> Unit, onError: (String, String) -> Unit
    ) = notInPps("kickUser", onError)

    fun updateRoomData(
        _data: Map<String, String>, _onSuccess: () -> Unit, onError: (String, String) -> Unit
    ) = notInPps("updateRoomData", onError)
}
