package com.margelo.nitro.expopico.social

import com.margelo.nitro.core.Promise
import com.bytedance.pico.matrix.proto.v2.OpenUserInfo
import com.pico.pps.sdk.base.common.NextInfo
import com.pico.pps.sdk.friend.IFriendClient
import com.pico.pps.sdk.friend.PicoFriendClient
import com.pico.pps.sdk.social.ISocialClient
import com.pico.pps.sdk.social.LaunchResult
import com.pico.pps.sdk.social.LaunchType
import com.pico.pps.sdk.social.PicoSocialClient

/**
 * `PicoSocial` backed by `platform-service-social` and
 * `platform-service-friend`.
 *
 * This is the package where the TypeScript API and PPS diverge most, so it
 * is worth being explicit about which way each call falls:
 *
 * - **Reading friends works.** `IFriendClient.getFriends()` is real, and
 *   pagination is a `NextInfo` cursor rather than a token string, so the
 *   `nextPageToken` this API returns is a serialised cursor — see
 *   `NextInfo.encode` / `decode` below.
 * - **Mutating a friendship does not.** `IFriendClient` has six methods and
 *   none of them accepts, declines, removes, blocks or unblocks. PICO
 *   routes all of that through a system flow —
 *   `launchFriendRequestFlow(userId)` opens it — because a title is not
 *   allowed to change a user's social graph without the system UI. Those
 *   calls fail with a message that says so instead of pretending.
 * - **Presence and invites work**, through `ISocialClient`.
 *
 * The unbacked calls are recorded in `docs/PPS-WIRING-GAPS.md`; this file
 * is where that audit becomes behaviour.
 */
class HybridPicoSocial : HybridPicoSocialSpec() {

  private val social: ISocialClient?
    get() {
      if (!PicoPps.sdkPresent) return null
      val context = PicoPps.context() ?: return null
      return try {
        PicoSocialClient.getSocialClient(context)
      } catch (_: Throwable) {
        null
      }
    }

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
    get() = social != null && friends != null

  override val sdkVersion: String
    get() = if (PicoPps.sdkPresent) PPS_VERSION else ""

  /**
   * The signed-in user, read from the friend service's account lookup.
   *
   * `loadAccountInfo(emptyList())` resolves to the caller's own record —
   * the friend client has no dedicated "me" call, and going through
   * `ISignInClient` would mean depending on `@expo-pico/account`, which
   * this module deliberately does not.
   *
   * The artifact marks `loadAccountInfo` `@Deprecated("Legacy")` without
   * naming a replacement, and nothing else on `IFriendClient` returns
   * account records. Revisit when PPS says what supersedes it.
   */
  override fun getCurrentUser(): Promise<SocialUser> {
    val friend = friends ?: return Promise.rejected(PicoPps.unavailable("getCurrentUser"))
    return friend.loadAccountInfo(emptyList()).bridge("getCurrentUser") { users ->
      users.firstOrNull()?.toSocialUser(isInSameApp = true)
        ?: throw IllegalStateException("NOT_SIGNED_IN: no account information is available")
    }
  }

  override fun getFriendList(
    pageSize: Double?,
    pageToken: String?,
  ): Promise<FriendListResult> {
    val friend = friends ?: return Promise.rejected(PicoPps.unavailable("getFriendList"))
    // PPS pages by cursor, not by size: `pageSize` has nowhere to go on
    // either call. It stays in the signature because the JS API is public,
    // and is documented here rather than silently dropped.
    val cursor = pageToken?.let { decodeCursor(it) }
    val task = if (cursor == null) friend.getFriends() else friend.getNextFriendList(cursor)
    return task.bridge("getFriendList") { response ->
      val list = response.friendList.orEmpty()
      FriendListResult(
        friends = list.map { it.toSocialUser(isInSameApp = false) }.toTypedArray(),
        nextPageToken = response.nextInfo?.takeIf { it.hasNext }?.encode(),
        totalCount = list.size.toDouble(),
      )
    }
  }

  /**
   * Friendship status is derived from the friend list.
   *
   * PPS exposes no per-user status query, and no pending-request list at
   * all, so the only two states this can distinguish honestly are FRIENDS
   * and NOT_FRIENDS. Returning PENDING_SENT or BLOCKED would be asserting
   * something the SDK never told us.
   */
  override fun getFriendshipStatus(userId: String): Promise<FriendshipStatus> {
    val friend = friends ?: return Promise.rejected(PicoPps.unavailable("getFriendshipStatus"))
    return friend.getFriends().bridge("getFriendshipStatus") { response ->
      val isFriend = response.friendList.orEmpty().any { it.openUid == userId }
      if (isFriend) FriendshipStatus.FRIENDS else FriendshipStatus.NOT_FRIENDS
    }
  }

  /**
   * Opens the system friend-request flow.
   *
   * `launchFriendRequestFlow` returns as soon as the flow is presented,
   * not when the user acts on it, so the `FriendRequest` returned here
   * describes the request that was offered rather than one confirmed sent.
   */
  override fun sendFriendRequest(userId: String): Promise<FriendRequest> {
    val friend = friends ?: return Promise.rejected(PicoPps.unavailable("sendFriendRequest"))
    val promise = Promise<FriendRequest>()
    friend.launchFriendRequestFlow(userId)
      .bridge("sendFriendRequest") { launched ->
        if (!launched) throw IllegalStateException("the friend request flow could not be opened")
        launched
      }
      .then {
        friend.loadAccountInfo(emptyList())
          .bridge("sendFriendRequest/self") { it.firstOrNull() }
          .then { self ->
            promise.resolve(
              FriendRequest(
                // PPS assigns no id to a request raised through the system
                // flow; the target is the only handle the caller has.
                requestId = userId,
                fromUser = self?.toSocialUser(isInSameApp = true) ?: unknownUser(),
                toUserId = userId,
                sentAt = System.currentTimeMillis().toDouble(),
              )
            )
          }
          .catch { promise.reject(it) }
      }
      .catch { promise.reject(it) }
    return promise
  }

  override fun getPendingFriendRequests(): Promise<Array<FriendRequest>> =
    Promise.rejected(systemFlowOnly("getPendingFriendRequests"))

  override fun acceptFriendRequest(requestId: String): Promise<Unit> =
    Promise.rejected(systemFlowOnly("acceptFriendRequest"))

  override fun declineFriendRequest(requestId: String): Promise<Unit> =
    Promise.rejected(systemFlowOnly("declineFriendRequest"))

  override fun removeFriend(userId: String): Promise<Unit> =
    Promise.rejected(systemFlowOnly("removeFriend"))

  override fun blockUser(userId: String): Promise<Unit> =
    Promise.rejected(systemFlowOnly("blockUser"))

  override fun unblockUser(userId: String): Promise<Unit> =
    Promise.rejected(systemFlowOnly("unblockUser"))

  /**
   * Presence.
   *
   * PPS models presence as "joinable, at this destination, in this
   * session" rather than as an online/away/busy status. `ONLINE` maps to
   * joinable; everything else maps to not-joinable, which is the closest
   * honest reading. The rich text rides along in `extra`.
   */
  override fun setPresence(options: PresenceOptions): Promise<Unit> {
    val socialClient = social ?: return Promise.rejected(PicoPps.unavailable("setPresence"))
    val built = com.pico.pps.sdk.social.PresenceOptions.Builder()
      .destinationApiName(options.destinationApiName.orEmpty())
      .isJoinable(options.status == PresenceStatus.ONLINE)
      .extra(options.richText.orEmpty())
      .build()
    return socialClient.setPresence(built).bridge("setPresence") { }
  }

  override fun clearPresence(): Promise<Unit> {
    val socialClient = social ?: return Promise.rejected(PicoPps.unavailable("clearPresence"))
    return socialClient.clearPresence().bridge("clearPresence") { }
  }

  /**
   * `sendInvites(userIds, destinationApiName)` is the real call. The
   * `data` map on the TypeScript options has no counterpart — PPS carries
   * arbitrary payload on presence, not on the invite — so it is not sent.
   */
  override fun sendInvites(options: InviteOptions): Promise<Array<SentInvite>> {
    val socialClient = social ?: return Promise.rejected(PicoPps.unavailable("sendInvites"))
    return socialClient
      .sendInvites(options.userIds.toList(), options.destinationApiName)
      .bridge("sendInvites") { sent ->
        sent.map { invite ->
          SentInvite(
            inviteId = invite.id?.toString().orEmpty(),
            toUserId = invite.recipient?.openUid.orEmpty(),
            destinationApiName = options.destinationApiName,
            sentAt = System.currentTimeMillis().toDouble(),
            // PPS attaches no expiry to a sent invite.
            expiresAt = 0.0,
          )
        }.toTypedArray()
      }
  }

  /**
   * PPS pushes no presence or friend-request events.
   *
   * The one callback it does offer is
   * `setLaunchIntentChangeCallback`, which fires when the app is
   * re-launched from an invite — a different thing from receiving one, and
   * with no matching event shape in this spec. Registration returns a real
   * id so JS subscribe/unsubscribe code is uniform; nothing is emitted.
   */
  override fun addFriendPresenceChangedListener(
    listener: (event: FriendPresenceChangedEvent) -> Unit
  ): Double = nextListenerId()

  override fun addFriendRequestReceivedListener(
    listener: (request: FriendRequest) -> Unit
  ): Double = nextListenerId()

  override fun addInviteReceivedListener(
    listener: (event: InviteReceivedEvent) -> Unit
  ): Double = nextListenerId()

  override fun removeListener(id: Double): Unit = Unit

  private var listenerCounter: Double = 0.0

  private fun nextListenerId(): Double {
    listenerCounter += 1.0
    return listenerCounter
  }

  private fun unknownUser(): SocialUser =
    SocialUser(
      userId = "",
      displayName = "",
      avatarUrl = null,
      presenceStatus = PresenceStatus.OFFLINE,
      presenceRichText = null,
      isInSameApp = false,
    )

  private fun OpenUserInfo.toSocialUser(isInSameApp: Boolean): SocialUser =
    SocialUser(
      userId = openUid.orEmpty(),
      displayName = displayName.orEmpty(),
      avatarUrl = avatarUrl,
      presenceStatus = presenceStatus.toPresenceStatus(),
      presenceRichText = presenceExtra ?: presenceDeepLinkMsg,
      // `fromAppId` identifies the title the user is currently in. It is
      // only comparable to our own package when PPS populated it.
      isInSameApp = isInSameApp || !fromAppId.isNullOrEmpty(),
    )

  private fun systemFlowOnly(what: String): Throwable =
    UnsupportedOperationException(
      "NOT_IN_PPS_1_0: $what has no PICO Platform Service backing. Friendships are " +
        "changed by the user through the PICO system UI — a title can open that flow " +
        "with sendFriendRequest(), but cannot alter the social graph directly."
    )

  /**
   * Synchronous by design: PPS returns `LaunchDetails` from a getter, not a
   * `Task`, because the launch intent is resolved before the app runs.
   *
   * Falls back to an all-empty `normal`/`unknown` record when PPS is absent,
   * so a caller can read it unconditionally at startup without a guard. That
   * is the honest default — an app with no launch intent was opened normally.
   */
  override fun getLaunchDetails(): PicoLaunchDetails {
    val socialClient = social ?: return emptyLaunchDetails()
    val details = runCatching { socialClient.getLaunchDetails() }.getOrNull()
      ?: return emptyLaunchDetails()
    return PicoLaunchDetails(
      launchType = when (details.launchType) {
        LaunchType.NORMAL -> PicoLaunchType.NORMAL
        LaunchType.INVITE -> PicoLaunchType.INVITE
        LaunchType.COORDINATED -> PicoLaunchType.COORDINATED
        LaunchType.DEEPLINK -> PicoLaunchType.DEEPLINK
        else -> PicoLaunchType.UNKNOWN
      },
      launchResult = when (details.launchResult) {
        LaunchResult.SUCCESS -> PicoLaunchResult.SUCCESS
        LaunchResult.FAILED_ROOM_FULL -> PicoLaunchResult.FAILED_ROOM_FULL
        LaunchResult.FAILED_GAME_ALREADY_STARTED ->
          PicoLaunchResult.FAILED_GAME_ALREADY_STARTED
        LaunchResult.FAILED_ROOM_NOT_FOUND -> PicoLaunchResult.FAILED_ROOM_NOT_FOUND
        LaunchResult.FAILED_USER_DECLINED -> PicoLaunchResult.FAILED_USER_DECLINED
        LaunchResult.FAILED_OTHER_REASON -> PicoLaunchResult.FAILED_OTHER
        else -> PicoLaunchResult.UNKNOWN
      },
      launchSource = details.launchSource.orEmpty(),
      deepLinkMessage = details.deepLinkMessage.orEmpty(),
      destinationApiName = details.destinationApiName.orEmpty(),
      trackingId = details.trackingID.orEmpty(),
      lobbySessionId = details.lobbySessionID.orEmpty(),
      matchSessionId = details.matchSessionID.orEmpty(),
      extra = details.extra.orEmpty(),
      clientAction = details.clientAction.orEmpty(),
    )
  }

  private fun emptyLaunchDetails() = PicoLaunchDetails(
    launchType = PicoLaunchType.NORMAL,
    launchResult = PicoLaunchResult.UNKNOWN,
    launchSource = "",
    deepLinkMessage = "",
    destinationApiName = "",
    trackingId = "",
    lobbySessionId = "",
    matchSessionId = "",
    extra = "",
    clientAction = "",
  )

  /**
   * First page only. `DestinationsListResult` also carries a `NextInfo`
   * cursor, but the family models pagination as an opaque `nextPageToken`
   * string and how NextInfo(hasNext, nextId, bodyParams) encodes into one is
   * still undecided — see docs/PPS-WIRING-GAPS.md. Returning the first page is
   * honest; inventing a token format now would be an API break to undo later.
   */
  override fun getDestinations(): Promise<Array<PicoDestination>> {
    val socialClient = social ?: return Promise.rejected(PicoPps.unavailable("getDestinations"))
    return socialClient.getDestinations().bridge("getDestinations") { result ->
      result.destinationList.orEmpty().map { destination ->
        PicoDestination(
          apiName = destination.apiName.orEmpty(),
          displayName = destination.displayName.orEmpty(),
          deepLinkMessage = destination.deepLinkMessage.orEmpty(),
        )
      }.toTypedArray()
    }
  }

  override fun launchPresenceInvitePanel(): Promise<Boolean> {
    val socialClient = social
      ?: return Promise.rejected(PicoPps.unavailable("launchPresenceInvitePanel"))
    return socialClient.launchPresenceInvitePanel()
      .bridge("launchPresenceInvitePanel") { it ?: false }
  }

  override fun launchInviteUserJoinRoomFlow(roomId: String): Promise<Boolean> {
    val socialClient = social
      ?: return Promise.rejected(PicoPps.unavailable("launchInviteUserJoinRoomFlow"))
    return socialClient.launchInviteUserJoinRoomFlow(roomId)
      .bridge("launchInviteUserJoinRoomFlow") { it ?: false }
  }

  override fun launchStore(): Promise<String> {
    val socialClient = social ?: return Promise.rejected(PicoPps.unavailable("launchStore"))
    return socialClient.launchStore().bridge("launchStore") { it.orEmpty() }
  }

  override fun shareVideo(videoPath: String, description: String): Promise<Boolean> {
    val socialClient = social ?: return Promise.rejected(PicoPps.unavailable("shareVideo"))
    return socialClient.shareVideo(videoPath, description).bridge("shareVideo") { it ?: false }
  }

  override fun shareImages(imagePaths: Array<String>): Promise<Boolean> {
    val socialClient = social ?: return Promise.rejected(PicoPps.unavailable("shareImages"))
    return socialClient.shareImages(imagePaths.toList()).bridge("shareImages") { it ?: false }
  }

  private companion object {
    /** Kept in step with `PPS_VERSION` in `plugin/src/ppsArtifacts.ts`. */
    const val PPS_VERSION = "1.0.0"

    /**
     * `OpenUserInfo.presenceStatus` is a bare `Integer`; the published
     * protobuf ships no enum for it. Zero is the unset default, which
     * reads as offline. Anything else is a user PPS considers present, and
     * it does not distinguish away from busy, so ONLINE is the only claim
     * the data supports.
     */
    fun Int?.toPresenceStatus(): PresenceStatus =
      if (this == null || this == 0) PresenceStatus.OFFLINE else PresenceStatus.ONLINE

    /**
     * `NextInfo` is a three-field cursor, and this API's `nextPageToken`
     * is a string. Encoding it here keeps the JS contract stable: if PPS
     * ever switches to an opaque token, only these two functions change.
     * The separator is one that cannot appear in a numeric id.
     */
    private const val CURSOR_SEPARATOR = "|"

    fun NextInfo.encode(): String = "$nextId$CURSOR_SEPARATOR${bodyParams.orEmpty()}"

    fun decodeCursor(token: String): NextInfo? {
      val index = token.indexOf(CURSOR_SEPARATOR)
      if (index < 0) return null
      val id = token.substring(0, index).toLongOrNull() ?: return null
      return NextInfo(true, id, token.substring(index + 1))
    }
  }
}
