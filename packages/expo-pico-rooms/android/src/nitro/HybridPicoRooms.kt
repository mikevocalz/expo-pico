package com.margelo.nitro.expopico.rooms

import com.margelo.nitro.core.Promise
import com.pico.pps.sdk.friend.IFriendClient
import com.pico.pps.sdk.friend.PicoFriendClient

/**
 * `PicoRooms` — read-only, because that is all PPS 1.0.x offers.
 *
 * There is no `platform-service-room` artifact. The only room data
 * anywhere in the SDK is `IFriendClient.getFriendsAndRooms()`, which
 * returns the rooms your friends are currently in so a title can show
 * "join Alice's game". It is a discovery feed, not room management: there
 * is no create, no join, no leave, no kick, no matchmaking pool.
 *
 * So `getRoomInfo` is real and the rest is not. The unbacked calls fail
 * with a message naming what PPS actually provides, rather than resolving
 * something invented — a `joinRoom` that silently succeeded and put the
 * player nowhere would be worse than one that fails.
 *
 * `docs/PPS-WIRING-GAPS.md` records this as confirmed against the
 * published artifacts. Note that `getFriendsAndRooms` is itself marked
 * `@Deprecated("Legacy")` in the 1.0.0 artifact with no named replacement,
 * so even the read path is on notice.
 */
class HybridPicoRooms : HybridPicoRoomsSpec() {

  private val friends: IFriendClient?
    get() {
      if (!PicoPps.sdkPresent) return null
      val context = PicoPps.context() ?: return null
      return try {
        PicoFriendClient.getFriendClient(context)
      } catch (_: Throwable) {
        null
      }
    }

  override val available: Boolean
    get() = friends != null

  override val sdkVersion: String
    get() = if (PicoPps.sdkPresent) PPS_VERSION else ""

  /**
   * Always disconnected: without a join call there is no session to be in.
   *
   * This is a property rather than a promise, so it cannot go and look —
   * and there would be nothing to look at.
   */
  override val sessionState: RoomSessionState
    get() = RoomSessionState(
      roomId = null,
      memberCount = 0.0,
      connectionState = RoomConnectionState.DISCONNECTED,
      role = null,
    )

  /**
   * Looks the room up in the friends-and-rooms feed.
   *
   * Member lists are not in the payload — PPS returns one friend per room
   * entry, being a "who can I join" feed rather than a roster — so `members`
   * is the friends seen in that room and `memberCount` counts exactly those
   * same entries. Neither reflects the room's true occupancy, which PPS does
   * not report; `maxMembers` is the only real capacity figure.
   */
  override fun getRoomInfo(roomId: String): Promise<RoomInfo> {
    val friend = friends ?: return Promise.rejected(PicoPps.unavailable("getRoomInfo"))
    return friend.getFriendsAndRooms().bridge("getRoomInfo") { response ->
      val entries = response.userAndRoomList.orEmpty()
        .filter { it.roomInfo?.id?.toString() == roomId }
      val room = entries.firstOrNull()?.roomInfo
        ?: throw NoSuchElementException(
          "ROOM_NOT_FOUND: no friend is currently in room '$roomId'. PPS only reports " +
            "rooms reachable through the friends feed."
        )
      RoomInfo(
        roomId = room.id?.toString().orEmpty(),
        name = room.name,
        joinPolicy = room.joinPolicy.toJoinPolicy(),
        memberCount = entries.size.toDouble(),
        maxMembers = room.maxUser?.toDouble() ?: 0.0,
        // PPS attaches no key/value payload to a room.
        data = emptyMap(),
        members = entries.mapNotNull { entry ->
          val user = entry.userInfo ?: return@mapNotNull null
          RoomMember(
            userId = user.openUid.orEmpty(),
            displayName = user.displayName.orEmpty(),
            // Roles are not modelled by PPS; everyone visible is a member.
            role = RoomMemberRole.MEMBER,
            isPresent = true,
          )
        }.toTypedArray(),
      )
    }
  }

  /**
   * The whole feed, one [RoomInfo] per distinct room.
   *
   * Same source as [getRoomInfo]; that one filters to a single id, this one
   * groups the lot. Returns an empty array rather than failing when no friend
   * is in a room — "nobody is playing right now" is an ordinary state.
   *
   * The mapping is duplicated from [getRoomInfo] on purpose. Factoring it into
   * a helper means naming the PPS bean types in a signature, and those names
   * are not in `docs/PPS-API-SURFACE.md`; inside the `bridge` lambda they stay
   * inferred, which is how the existing read path already works.
   */
  override fun getFriendsAndRooms(): Promise<Array<RoomInfo>> {
    val friend = friends
      ?: return Promise.rejected(PicoPps.unavailable("getFriendsAndRooms"))
    return friend.getFriendsAndRooms().bridge("getFriendsAndRooms") { response ->
      response.userAndRoomList.orEmpty()
        .filter { it.roomInfo != null }
        .groupBy { it.roomInfo?.id?.toString().orEmpty() }
        .mapNotNull { (roomId, entries) ->
          val room = entries.firstOrNull()?.roomInfo ?: return@mapNotNull null
          RoomInfo(
            roomId = roomId,
            name = room.name,
            joinPolicy = room.joinPolicy.toJoinPolicy(),
            memberCount = entries.size.toDouble(),
            maxMembers = room.maxUser?.toDouble() ?: 0.0,
            data = emptyMap(),
            members = entries.mapNotNull { entry ->
              val user = entry.userInfo ?: return@mapNotNull null
              RoomMember(
                userId = user.openUid.orEmpty(),
                displayName = user.displayName.orEmpty(),
                role = RoomMemberRole.MEMBER,
                isPresent = true,
              )
            }.toTypedArray(),
          )
        }
        .toTypedArray()
    }
  }

  override fun createRoom(options: CreateRoomOptions?): Promise<RoomInfo> =
    Promise.rejected(notInPps("createRoom"))

  override fun joinRoom(roomId: String): Promise<JoinRoomResult> =
    Promise.rejected(notInPps("joinRoom"))

  override fun leaveRoom(): Promise<Unit> =
    Promise.rejected(notInPps("leaveRoom"))

  override fun kickUser(userId: String): Promise<Unit> =
    Promise.rejected(notInPps("kickUser"))

  override fun updateRoomData(data: Map<String, String>): Promise<Unit> =
    Promise.rejected(notInPps("updateRoomData"))

  override fun requestMatchmaking(options: MatchmakingOptions): Promise<Unit> =
    Promise.rejected(notInPps("requestMatchmaking"))

  override fun cancelMatchmaking(): Promise<Unit> =
    Promise.rejected(notInPps("cancelMatchmaking"))

  // No room events exist to subscribe to. Registration returns a real id
  // so JS subscribe/unsubscribe code stays uniform across packages;
  // nothing is ever emitted.
  override fun addRoomUpdatedListener(listener: (event: RoomUpdatedEvent) -> Unit): Double =
    nextListenerId()

  override fun addRoomUserJoinedListener(listener: (event: RoomUserJoinedEvent) -> Unit): Double =
    nextListenerId()

  override fun addRoomUserLeftListener(listener: (event: RoomUserLeftEvent) -> Unit): Double =
    nextListenerId()

  override fun addMatchmakingFoundListener(
    listener: (event: MatchmakingFoundEvent) -> Unit
  ): Double = nextListenerId()

  override fun removeListener(id: Double): Unit = Unit

  private var listenerCounter: Double = 0.0

  private fun nextListenerId(): Double {
    listenerCounter += 1.0
    return listenerCounter
  }

  private fun notInPps(what: String): Throwable =
    UnsupportedOperationException(
      "NOT_IN_PPS_1_0: $what has no PICO Platform Service backing. PPS 1.0.x " +
        "publishes no room-management artifact — the only room data available is " +
        "the read-only friends-and-rooms feed behind getRoomInfo()."
    )

  private companion object {
    /** Kept in step with `PPS_VERSION` in `plugin/src/ppsArtifacts.ts`. */
    const val PPS_VERSION = "1.0.0"

    /**
     * `RoomInfo.joinPolicy` is a bare `Integer` with no accompanying enum
     * in the published protobuf. The TypeScript enum's own order —
     * everyone, friends-only, invite-only — is the widest-to-narrowest
     * ordering these APIs conventionally use. Anything unrecognised falls
     * back to INVITE_ONLY: guessing too restrictive shows the player a
     * room they cannot enter, guessing too permissive is a failed join.
     */
    fun Int?.toJoinPolicy(): RoomJoinPolicy = when (this) {
      0 -> RoomJoinPolicy.EVERYONE
      1 -> RoomJoinPolicy.FRIENDS_ONLY
      else -> RoomJoinPolicy.INVITE_ONLY
    }
  }
}
