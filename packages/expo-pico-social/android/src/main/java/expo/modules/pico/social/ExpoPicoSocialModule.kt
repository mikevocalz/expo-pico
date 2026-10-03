package expo.modules.pico.social

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoPicoSocialModule : Module() {
  private val launchDetailsSink: (Map<String, Any?>) -> Unit = { details ->
    sendEvent("onLaunchDetails", details)
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoPicoSocial")

    // PPS 1.0 pushes launch-intent changes only. It has no listener for friend
    // presence, incoming friend requests or invites (see SocialLaunchDetails and
    // the README), so those events are not declared.
    Events("onLaunchDetails")

    // Register the PPS callback before init: init replays the launch intent
    // through the same callback list.
    OnCreate {
      SocialLaunchDetails.sink = launchDetailsSink
      SocialLaunchDetails.registerCallbackIfNeeded(appContext.reactContext)
      SocialLaunchDetails.initIfNeeded(appContext.currentActivity)
    }

    OnActivityEntersForeground {
      SocialLaunchDetails.registerCallbackIfNeeded(appContext.reactContext)
      SocialLaunchDetails.initIfNeeded(appContext.currentActivity)
    }

    // An invite accepted while the app runs arrives as a new intent. PPS decides
    // whether it carries PICO launch keys and fires the callback if so.
    OnNewIntent { intent ->
      SocialLaunchDetails.registerCallbackIfNeeded(appContext.reactContext)
      SocialLaunchDetails.initIfNeeded(appContext.currentActivity)
      SocialLaunchDetails.onNewIntent(intent)
    }

    // A JS reload can create the next module before this one is destroyed, so
    // only clear the sink if it is still ours.
    OnDestroy {
      if (SocialLaunchDetails.sink === launchDetailsSink) SocialLaunchDetails.sink = null
    }

    Constants {
      mapOf(
        "socialSdkAvailable" to SocialUtils.isSocialSdkAvailable(),
        "socialSdkVersion"   to SocialUtils.getSocialSdkVersion()
      )
    }

    // Synchronous: PPS returns LaunchDetails from a getter. Never throws.
    Function("getLaunchDetails") {
      SocialLaunchDetails.initIfNeeded(appContext.currentActivity)
      SocialLaunchDetails.read(appContext.reactContext)
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
