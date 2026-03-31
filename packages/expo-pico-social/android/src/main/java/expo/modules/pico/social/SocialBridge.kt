package expo.modules.pico.social

/**
 * SocialBridge isolates all PICO Platform SDK social calls.
 *
 * Threading: All functions called from AsyncFunction background threads.
 *
 * See: https://developer.picoxr.com/document/unity/friends/
 */
internal object SocialBridge {

  @Volatile
  var moduleRef: ExpoPicoSocialModule? = null

  fun getCurrentUser(
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   FriendsAPI.getCurrentUser { result ->
    //     if (result.isSuccess) onSuccess(mapOf(
    //       "userId"            to result.user.id,
    //       "displayName"       to result.user.displayName,
    //       "avatarUrl"         to result.user.avatarUrl,
    //       "presenceStatus"    to result.user.presenceStatus.name.lowercase(),
    //       "presenceRichText"  to result.user.presenceRichText,
    //       "isInSameApp"       to result.user.isInSameApp
    //     ))
    //     else onError("UNKNOWN", result.errorMessage ?: "getCurrentUser failed")
    //   }
    onError("NOT_IMPLEMENTED", "getCurrentUser: Social SDK not yet linked.")
  }

  fun getFriendList(
    pageToken: String?,
    pageSize: Int,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   FriendsAPI.getFriendList(pageToken, pageSize) { result ->
    //     if (result.isSuccess) onSuccess(mapOf(
    //       "friends"       to result.friends.map { it.toMap() },
    //       "nextPageToken" to result.nextPageToken,
    //       "totalCount"    to result.totalCount
    //     ))
    //     else onError("UNKNOWN", result.errorMessage ?: "getFriendList failed")
    //   }
    onError("NOT_IMPLEMENTED", "getFriendList: Social SDK not yet linked.")
  }

  fun getFriendshipStatus(
    userId: String,
    onSuccess: (String) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): FriendsAPI.getFriendshipStatus(userId) { result -> ... }
    onError("NOT_IMPLEMENTED", "getFriendshipStatus: Social SDK not yet linked.")
  }

  fun sendFriendRequest(
    userId: String,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): FriendsAPI.sendFriendRequest(userId) { result -> ... }
    onError("NOT_IMPLEMENTED", "sendFriendRequest: Social SDK not yet linked.")
  }

  fun acceptFriendRequest(
    requestId: String,
    onSuccess: () -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): FriendsAPI.acceptFriendRequest(requestId) { result -> ... }
    onError("NOT_IMPLEMENTED", "acceptFriendRequest: Social SDK not yet linked.")
  }

  fun declineFriendRequest(
    requestId: String,
    onSuccess: () -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): FriendsAPI.declineFriendRequest(requestId) { result -> ... }
    onError("NOT_IMPLEMENTED", "declineFriendRequest: Social SDK not yet linked.")
  }

  fun removeFriend(
    userId: String,
    onSuccess: () -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): FriendsAPI.removeFriend(userId) { result -> ... }
    onError("NOT_IMPLEMENTED", "removeFriend: Social SDK not yet linked.")
  }

  fun blockUser(
    userId: String,
    onSuccess: () -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): FriendsAPI.blockUser(userId) { result -> ... }
    onError("NOT_IMPLEMENTED", "blockUser: Social SDK not yet linked.")
  }

  fun unblockUser(
    userId: String,
    onSuccess: () -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): FriendsAPI.unblockUser(userId) { result -> ... }
    onError("NOT_IMPLEMENTED", "unblockUser: Social SDK not yet linked.")
  }

  fun setPresence(
    status: String,
    richText: String?,
    destinationApiName: String?,
    onSuccess: () -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   FriendsAPI.setPresence(status, richText, destinationApiName) { result -> ... }
    onError("NOT_IMPLEMENTED", "setPresence: Social SDK not yet linked.")
  }

  fun clearPresence(
    onSuccess: () -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): FriendsAPI.clearPresence { result -> ... }
    onError("NOT_IMPLEMENTED", "clearPresence: Social SDK not yet linked.")
  }

  fun sendInvites(
    destinationApiName: String,
    userIds: List<String>,
    data: Map<String, String>,
    onSuccess: (List<Map<String, Any?>>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   FriendsAPI.sendInvites(destinationApiName, userIds, data) { result ->
    //     if (result.isSuccess) onSuccess(result.invites.map { i ->
    //       mapOf(
    //         "inviteId"           to i.id,
    //         "toUserId"           to i.toUserId,
    //         "destinationApiName" to i.destinationApiName,
    //         "sentAt"             to i.sentAt,
    //         "expiresAt"          to i.expiresAt
    //       )
    //     })
    //     else onError("UNKNOWN", result.errorMessage ?: "sendInvites failed")
    //   }
    onError("NOT_IMPLEMENTED", "sendInvites: Social SDK not yet linked.")
  }

  fun getPendingFriendRequests(
    onSuccess: (List<Map<String, Any?>>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): FriendsAPI.getPendingFriendRequests { result -> ... }
    onError("NOT_IMPLEMENTED", "getPendingFriendRequests: Social SDK not yet linked.")
  }
}
