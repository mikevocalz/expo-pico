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

    AsyncFunction("getFriendList") { pageToken: String?, pageSize: Int, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SocialBridge.getFriendList(pageToken, pageSize,
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

    // status: String, richText: String?, destinationApiName: String?
    AsyncFunction("setPresence") { status: String, richText: String?, destinationApiName: String?, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
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

    // destinationApiName: String, userIds: List<String>, data: Map<String, String>
    AsyncFunction("sendInvites") { destinationApiName: String, userIds: List<String>, data: Map<String, String>, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SocialBridge.sendInvites(destinationApiName, userIds, data,
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

  private inline fun guardAvailability(promise: Promise, earlyReturn: () -> Unit) {
    if (!SocialUtils.isSocialSdkAvailable()) {
      promise.reject("SERVICE_UNAVAILABLE", "Social SDK not available on this build", null)
      earlyReturn()
    }
  }
}
