package expo.modules.pico.rooms

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference

class ExpoPicoRoomsModule : Module() {

  // ─── Atomic local state (read by getRoomSessionState sync Function) ─────────
  private val currentRoomId = AtomicReference<String?>(null)
  private val memberCount = AtomicInteger(0)
  private val connectionState = AtomicReference("disconnected")
  private val currentRole = AtomicReference<String?>(null)

  override fun definition() = ModuleDefinition {
    Name("ExpoPicoRooms")

    // Declare all event channels upfront — required by Expo Modules before sendEvent calls
    Events("onRoomUpdated", "onRoomUserJoined", "onRoomUserLeft", "onMatchmakingFound")

    // Constants block: evaluated once at module load, exposed as JS constants
    Constants {
      mapOf(
        "roomsSdkAvailable" to RoomsUtils.isRoomsSdkAvailable(),
        "roomsSdkVersion"   to RoomsUtils.getRoomsSdkVersion()
      )
    }

    // Sync Function: reads atomically-cached state. Runs on JS thread — must not block.
    Function("getRoomSessionState") {
      mapOf(
        "roomId"          to currentRoomId.get(),
        "memberCount"     to memberCount.get(),
        "connectionState" to connectionState.get(),
        "role"            to currentRole.get()
      )
    }

    // JS: createRoom(options?: CreateRoomOptions { joinPolicy?, maxMembers?, data? })
    // CreateRoomOptions declares no defaults. The PPS 1.0 bridge rejects NOT_IN_PPS_1_0
    // regardless, so these fallbacks only exist to keep the signature total.
    AsyncFunction("createRoom") { options: Map<String, Any?>?, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      val joinPolicy = options?.get("joinPolicy") as? String ?: "everyone"
      val maxMembers = (options?.get("maxMembers") as? Number)?.toInt() ?: 0
      val data = (options?.get("data") as? Map<*, *>)
        ?.entries
        ?.mapNotNull { (k, v) -> if (k is String && v is String) k to v else null }
        ?.toMap()
        .orEmpty()
      connectionState.set("connecting")
      RoomsBridge.createRoom(joinPolicy, maxMembers, data,
        onSuccess = { bundle ->
          currentRoomId.set(bundle["roomId"] as? String)
          connectionState.set("joined")
          currentRole.set("owner")
          memberCount.set(1)
          promise.resolve(bundle)
        },
        onError = { code, msg ->
          connectionState.set("error")
          promise.reject(code, msg, null)
        }
      )
    }

    AsyncFunction("joinRoom") { roomId: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      connectionState.set("connecting")
      RoomsBridge.joinRoom(roomId,
        onSuccess = { bundle ->
          currentRoomId.set(roomId)
          connectionState.set("joined")
          currentRole.set(bundle["role"] as? String ?: "member")
          promise.resolve(bundle)
        },
        onError = { code, msg ->
          connectionState.set("error")
          promise.reject(code, msg, null)
        }
      )
    }

    AsyncFunction("leaveRoom") { promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      connectionState.set("leaving")
      RoomsBridge.leaveRoom(
        onSuccess = {
          currentRoomId.set(null)
          currentRole.set(null)
          memberCount.set(0)
          connectionState.set("disconnected")
          promise.resolve(null)
        },
        onError = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("getRoomInfo") { roomId: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      RoomsBridge.getRoomInfo(roomId,
        onSuccess = { bundle ->
          // Update local member count from server response
          (bundle["memberCount"] as? Int)?.let { memberCount.set(it) }
          promise.resolve(bundle)
        },
        onError = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("getFriendsAndRooms") { promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      RoomsBridge.getFriendsAndRooms(
        onSuccess = { rooms -> promise.resolve(rooms) },
        onError = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("kickUser") { userId: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      RoomsBridge.kickUser(userId,
        onSuccess = { promise.resolve(null) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("updateRoomData") { data: Map<String, String>, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      RoomsBridge.updateRoomData(data,
        onSuccess = { promise.resolve(null) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }
  }

  // ─── Inline guard — avoids repeating the availability check in each AsyncFunction

  private inline fun guardAvailability(promise: Promise, earlyReturn: () -> Unit) {
    if (!RoomsUtils.isRoomsSdkAvailable()) {
      promise.reject("SERVICE_UNAVAILABLE", "Rooms SDK not available on this build", null)
      earlyReturn()
    }
  }

  // ─── Push-event emitters — called by RoomsBridge when SDK fires callbacks ───

  /** Called when the room's data or member count changes. */
  internal fun emitRoomUpdated(roomId: String, newMemberCount: Int, data: Map<String, String>) {
    memberCount.set(newMemberCount)
    sendEvent("onRoomUpdated", mapOf(
      "roomId"      to roomId,
      "memberCount" to newMemberCount,
      "data"        to data
    ))
  }

  /** Called when a user joins the current room. */
  internal fun emitUserJoined(roomId: String, userId: String, displayName: String, role: String) {
    memberCount.incrementAndGet()
    sendEvent("onRoomUserJoined", mapOf(
      "roomId"      to roomId,
      "userId"      to userId,
      "displayName" to displayName,
      "role"        to role
    ))
  }

  /** Called when a user leaves the current room. */
  internal fun emitUserLeft(roomId: String, userId: String, reason: String) {
    memberCount.decrementAndGet()
    sendEvent("onRoomUserLeft", mapOf(
      "roomId"  to roomId,
      "userId"  to userId,
      "reason"  to reason
    ))
  }

  /** Called when matchmaking finds a room. */
  internal fun emitMatchmakingFound(roomId: String, poolName: String) {
    sendEvent("onMatchmakingFound", mapOf(
      "roomId"   to roomId,
      "poolName" to poolName
    ))
  }
}
