package expo.modules.pico.social

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoPicoSocialModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoPicoSocial")

    Events("onFriendPresenceChanged", "onFriendRequestReceived", "onInviteReceived")

    Constants {
      mapOf(
        "socialSdkAvailable" to SocialUtils.isSocialSdkAvailable(),
        "socialSdkVersion"   to SocialUtils.getSocialSdkVersion()
      )
    }

    AsyncFunction("getCurrentUser") { promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SocialBridge.getCurrentUser(
        onSuccess = { map -> promise.resolve(map) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    // JS: getFriendList(pageSize?, pageToken?). The bridge ignores both (PPS getFriends()
    // takes no paging args), so the 20 default only matters if paging is wired later.
    AsyncFunction("getFriendList") { pageSize: Int?, pageToken: String?, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SocialBridge.getFriendList(pageToken, pageSize ?: DEFAULT_FRIEND_PAGE_SIZE,
        onSuccess = { map -> promise.resolve(map) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("getFriendshipStatus") { userId: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SocialBridge.getFriendshipStatus(userId,
        onSuccess = { status -> promise.resolve(status) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("sendFriendRequest") { userId: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SocialBridge.sendFriendRequest(userId,
        onSuccess = { map -> promise.resolve(map) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("acceptFriendRequest") { requestId: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SocialBridge.acceptFriendRequest(requestId,
        onSuccess = { promise.resolve(null) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("declineFriendRequest") { requestId: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SocialBridge.declineFriendRequest(requestId,
        onSuccess = { promise.resolve(null) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("removeFriend") { userId: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SocialBridge.removeFriend(userId,
        onSuccess = { promise.resolve(null) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("blockUser") { userId: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SocialBridge.blockUser(userId,
        onSuccess = { promise.resolve(null) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("unblockUser") { userId: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SocialBridge.unblockUser(userId,
        onSuccess = { promise.resolve(null) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    // JS: setPresence(options: PresenceOptions { status, richText?, destinationApiName? })
    AsyncFunction("setPresence") { options: Map<String, Any?>, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      val status = options["status"] as? String
        ?: return@AsyncFunction promise.reject("INVALID_ARGUMENT", "status is required", null)
      val richText = options["richText"] as? String
      val destinationApiName = options["destinationApiName"] as? String
      SocialBridge.setPresence(status, richText, destinationApiName,
        onSuccess = { promise.resolve(null) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("clearPresence") { promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SocialBridge.clearPresence(
        onSuccess = { promise.resolve(null) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    // options: InviteOptions { destinationApiName, userIds, data? } — JS passes one object.
    // PPS sendInvites takes no payload, so `data` is not forwarded.
    AsyncFunction("sendInvites") { options: Map<String, Any?>, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      val destinationApiName = options["destinationApiName"] as? String
        ?: return@AsyncFunction promise.reject("INVALID_ARGUMENT", "destinationApiName is required", null)
      val userIds = (options["userIds"] as? List<*>)?.filterIsInstance<String>().orEmpty()
      SocialBridge.sendInvites(userIds, destinationApiName,
        onSuccess = { list -> promise.resolve(list) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("getPendingFriendRequests") { promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SocialBridge.getPendingFriendRequests(
        onSuccess = { list -> promise.resolve(list) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }
  }

  internal fun emitFriendPresenceChanged(userId: String, previous: String, current: String, richText: String?) {
    sendEvent("onFriendPresenceChanged", mapOf(
      "userId"         to userId,
      "previousStatus" to previous,
      "currentStatus"  to current,
      "richText"       to richText
    ))
  }

  internal fun emitFriendRequestReceived(requestMap: Map<String, Any?>) {
    sendEvent("onFriendRequestReceived", mapOf("request" to requestMap))
  }

  internal fun emitInviteReceived(inviteId: String, fromUser: Map<String, Any?>, destinationApiName: String, data: Map<String, String>) {
    sendEvent("onInviteReceived", mapOf(
      "inviteId"           to inviteId,
      "fromUser"           to fromUser,
      "destinationApiName" to destinationApiName,
      "data"               to data
    ))
  }

  private companion object {
    const val DEFAULT_FRIEND_PAGE_SIZE = 20
  }

  private inline fun guardAvailability(promise: Promise, earlyReturn: () -> Unit) {
    if (!SocialUtils.isSocialSdkAvailable()) {
      promise.reject("SERVICE_UNAVAILABLE", "Social SDK not available on this build", null)
      earlyReturn()
    }
  }
}
