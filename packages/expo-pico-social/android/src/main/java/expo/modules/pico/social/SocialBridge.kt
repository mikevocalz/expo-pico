package expo.modules.pico.social

import expo.modules.pico.PicoAppContext
import expo.modules.pico.PicoPlatformSDK

/**
 * PPS 1.0.x splits "social" across two clients:
 *
 *   PicoFriendClient.getFriendClient(ctx) → IFriendClient
 *     getFriends() → Task<GetFriendsResponse>
 *     getNextFriendList(NextInfo) → ...
 *     launchFriendRequestFlow(String userId) → Task<Boolean>   // opens UI
 *     loadAccountInfo(List<String> userIds) → Task<List<OpenUserInfo>>
 *     getFriendsAndRooms() → Task<LoadFriendsAndRoomsResponse>
 *
 *   PicoSocialClient.getSocialClient(ctx) → ISocialClient
 *     setPresence(PresenceOptions) → Task<Boolean>
 *     clearPresence() → Task<Boolean>
 *     sendInvites(List<String>, String dest) → Task<List<SentInviteInfo>>
 *     launchPresenceInvitePanel() → Task<Boolean>
 *     launchInviteUserJoinRoomFlow(String) → Task<Boolean>
 *     getDestinations() → Task<DestinationsListResult>
 *     ... etc
 *
 * PPS 1.0.x does NOT expose: getFriendshipStatus, acceptFriendRequest,
 * declineFriendRequest, removeFriend, blockUser, unblockUser. These are
 * either UI-driven (launchFriendRequestFlow) or out of scope. They return
 * an honest `NOT_IN_PPS_1_0` error so callers can adapt.
 */
internal object SocialBridge {
    private val FRIEND_CLIENT = arrayOf("com.pico.pps.sdk.friend.PicoFriendClient")
    private val FRIEND_FACTORY = arrayOf("getFriendClient")

    private val SOCIAL_CLIENT = arrayOf("com.pico.pps.sdk.social.PicoSocialClient")
    private val SOCIAL_FACTORY = arrayOf("getSocialClient")

    // For "getCurrentUser", route to the auth client (same identity as account module).
    private val AUTH_CLIENT = arrayOf("com.pico.pps.sdk.auth.PicoSignInClient")
    private val AUTH_FACTORY = arrayOf("getSignInClient")

    private inline fun ctx(onError: (String, String) -> Unit, block: (android.content.Context) -> Unit) {
        PicoAppContext.get()?.let(block) ?: onError("NO_CONTEXT", "PicoAppContext not initialized")
    }

    private fun notInPps(method: String, onError: (String, String) -> Unit) {
        onError("NOT_IN_PPS_1_0",
            "$method not in PPS 1.0.x. PICO removed it during the PVR→PPS SDK rewrite.")
    }

    fun getCurrentUser(
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        PicoPlatformSDK.callTask(c, AUTH_CLIENT, AUTH_FACTORY,
            arrayOf("getUserInfo"),
            arrayOf<Any?>(),
            { raw ->
                val resp = if (raw is Map<*, *>) {
                    @Suppress("UNCHECKED_CAST") raw as Map<String, Any?>
                } else PicoPlatformSDK.objectToMap(raw) ?: emptyMap()
                (resp["loginUser"] as? Map<*, *>)?.let {
                    @Suppress("UNCHECKED_CAST") it as Map<String, Any?>
                } ?: resp
            },
            onSuccess, onError)
    }

    fun getFriendList(
        pageToken: String?, pageSize: Int,
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        // PPS getFriends() takes no pagination args (SDK paginates internally
        // via getNextFriendList). pageToken/pageSize are ignored.
        PicoPlatformSDK.callTask(c, FRIEND_CLIENT, FRIEND_FACTORY,
            arrayOf("getFriends"),
            arrayOf<Any?>(),
            { raw -> PicoPlatformSDK.objectToMap(raw) ?: mapOf<String, Any?>("friends" to PicoPlatformSDK.coerceToList(raw)) },
            onSuccess, onError)
    }

    fun getFriendshipStatus(
        userId: String, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) {
        // Emulate via loadAccountInfo([userId]) — if the user is in the bulk
        // info response with no relationship error, we report "known".
        val ctx = PicoAppContext.get() ?: return onError("NO_CONTEXT", "PicoAppContext not initialized")
        PicoPlatformSDK.callTask(ctx, FRIEND_CLIENT, FRIEND_FACTORY,
            arrayOf("loadAccountInfo"),
            arrayOf<Any?>(listOf(userId)),
            { raw ->
                val list = PicoPlatformSDK.coerceToList(raw)
                mapOf<String, Any?>(
                    "userId" to userId,
                    "status" to if (list.isNotEmpty()) "known" else "unknown",
                    "info" to list.firstOrNull(),
                )
            },
            onSuccess, onError)
    }

    fun sendFriendRequest(
        userId: String, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        // PPS only exposes launchFriendRequestFlow — opens the OS UI, user
        // confirms inside. We bubble the return boolean as `flowLaunched`.
        PicoPlatformSDK.callTask(c, FRIEND_CLIENT, FRIEND_FACTORY,
            arrayOf("launchFriendRequestFlow"),
            arrayOf<Any?>(userId),
            { raw -> mapOf<String, Any?>("userId" to userId, "flowLaunched" to (raw as? Boolean ?: true)) },
            onSuccess, onError)
    }

    fun acceptFriendRequest(_id: String, _onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit) =
        notInPps("acceptFriendRequest", onError)

    fun declineFriendRequest(_id: String, _onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit) =
        notInPps("declineFriendRequest", onError)

    fun removeFriend(_userId: String, _onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit) =
        notInPps("removeFriend", onError)

    fun blockUser(_userId: String, _onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit) =
        notInPps("blockUser", onError)

    fun unblockUser(_userId: String, _onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit) =
        notInPps("unblockUser", onError)

    fun getPendingFriendRequests(_onSuccess: (List<Map<String, Any?>>) -> Unit, onError: (String, String) -> Unit) =
        notInPps("getPendingFriendRequests", onError)

    fun sendInvites(
        userIds: List<String>, destination: String,
        onSuccess: (List<Map<String, Any?>>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        PicoPlatformSDK.callTask(c, SOCIAL_CLIENT, SOCIAL_FACTORY,
            arrayOf("sendInvites"),
            arrayOf<Any?>(userIds, destination),
            { PicoPlatformSDK.coerceToList(it) },
            onSuccess, onError)
    }

    // ISocialClient.setPresence(PresenceOptions) — construct via Builder.
    fun setPresence(
        status: String, richText: String?, destinationApiName: String?,
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        val options = try { buildPresenceOptions(destinationApiName, status, richText) }
        catch (t: Throwable) {
            return@ctx onError("SDK_SCHEMA", "Could not construct PresenceOptions: ${t.javaClass.simpleName}: ${t.message}")
        }
        PicoPlatformSDK.callTask(c, SOCIAL_CLIENT, SOCIAL_FACTORY,
            arrayOf("setPresence"),
            arrayOf<Any?>(options),
            { _ -> mapOf<String, Any?>("status" to status, "set" to true) },
            onSuccess, onError)
    }

    fun clearPresence(
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        PicoPlatformSDK.callTask(c, SOCIAL_CLIENT, SOCIAL_FACTORY,
            arrayOf("clearPresence"),
            arrayOf<Any?>(),
            { _ -> mapOf<String, Any?>("cleared" to true) },
            onSuccess, onError)
    }

    private fun buildPresenceOptions(destination: String?, status: String, richText: String?): Any {
        val builderClass = Class.forName("com.pico.pps.sdk.social.PresenceOptions\$Builder")
        val builder = builderClass.getDeclaredConstructor().newInstance()
        // destinationApiName carries the deep-link destination; isJoinable comes
        // from `status` if it's "joinable"; richText goes into extra.
        if (destination != null) {
            builderClass.getMethod("destinationApiName", String::class.java).invoke(builder, destination)
        }
        builderClass.getMethod("isJoinable", java.lang.Boolean.TYPE)
            .invoke(builder, status.equals("joinable", ignoreCase = true) || status.equals("online", ignoreCase = true))
        if (richText != null) {
            builderClass.getMethod("extra", String::class.java).invoke(builder, richText)
        }
        return builderClass.getDeclaredMethod("build").invoke(builder)
    }
}
