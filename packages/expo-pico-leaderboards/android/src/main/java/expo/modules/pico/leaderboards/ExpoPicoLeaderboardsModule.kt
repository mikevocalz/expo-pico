package expo.modules.pico.leaderboards

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoPicoLeaderboardsModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("ExpoPicoLeaderboards")

    // No events: leaderboards are stateless query/write, no push model
    Constants {
      mapOf(
        "leaderboardsSdkAvailable" to LeaderboardsUtils.isLeaderboardsSdkAvailable(),
        "leaderboardsSdkVersion"   to LeaderboardsUtils.getLeaderboardsSdkVersion()
      )
    }

    AsyncFunction("getAllLeaderboards") { promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      LeaderboardsBridge.getAllLeaderboards(
        onSuccess = { list -> promise.resolve(list) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    // score: Long — JS numbers bridged to Long for 64-bit score support
    // extraData: String? — nullable bridged from JS null
    // supplementaryMetric: Double? — nullable metric
    // forceUpdate: Boolean
    AsyncFunction("writeScore") { apiName: String, score: Long, extraData: String?, supplementaryMetric: Double?, forceUpdate: Boolean, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      LeaderboardsBridge.writeScore(apiName, score, extraData, supplementaryMetric, forceUpdate,
        onSuccess = { bundle -> promise.resolve(bundle) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("getEntries") { apiName: String, filter: String, startAt: String, pageSize: Int, pageToken: String?, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      LeaderboardsBridge.getEntries(apiName, filter, startAt, pageSize, pageToken,
        onSuccess = { bundle -> promise.resolve(bundle) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("getEntriesAfterRank") { apiName: String, afterRank: Int, pageSize: Int, pageToken: String?, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      LeaderboardsBridge.getEntriesAfterRank(apiName, afterRank, pageSize, pageToken,
        onSuccess = { bundle -> promise.resolve(bundle) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("getUserEntry") { apiName: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      LeaderboardsBridge.getUserEntry(apiName,
        onSuccess = { entry -> promise.resolve(entry) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }
  }

  private inline fun guardAvailability(promise: Promise, earlyReturn: () -> Unit) {
    if (!LeaderboardsUtils.isLeaderboardsSdkAvailable()) {
      promise.reject("SERVICE_UNAVAILABLE", "Leaderboards SDK not available on this build", null)
      earlyReturn()
    }
  }
}
