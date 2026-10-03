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

    // JS: writeScore(apiName, score, options?: WriteScoreOptions { extraData?, supplementaryMetric?, forceUpdate? })
    // score arrives as a JS number and is bridged to Long for 64-bit scores.
    AsyncFunction("writeScore") { apiName: String, score: Long, options: Map<String, Any?>?, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      val extraData = options?.get("extraData") as? String
      val supplementaryMetric = (options?.get("supplementaryMetric") as? Number)?.toDouble()
      val forceUpdate = options?.get("forceUpdate") as? Boolean ?: false
      LeaderboardsBridge.writeScore(apiName, score, extraData, supplementaryMetric, forceUpdate,
        onSuccess = { bundle -> promise.resolve(bundle) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    // JS: getEntries(apiName, options?: GetEntriesOptions { filter?, startAt?, pageSize?, pageToken? })
    // GetEntriesOptions declares no defaults. Missing filter/startAt fall through to the
    // bridge's parse defaults (global, centered-on-viewer); pageSize defaults to 20 (README).
    AsyncFunction("getEntries") { apiName: String, options: Map<String, Any?>?, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      val filter = options?.get("filter") as? String ?: DEFAULT_FILTER
      val startAt = options?.get("startAt") as? String ?: DEFAULT_START_AT
      val pageSize = (options?.get("pageSize") as? Number)?.toInt() ?: DEFAULT_PAGE_SIZE
      val pageToken = options?.get("pageToken") as? String
      LeaderboardsBridge.getEntries(apiName, filter, startAt, pageSize, pageToken,
        onSuccess = { bundle -> promise.resolve(bundle) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    // JS: getEntriesAfterRank(apiName, afterRank, options?: GetEntriesOptions)
    // PPS getEntriesAfterRank has no filter/startAt; only pageSize and pageToken are read.
    AsyncFunction("getEntriesAfterRank") { apiName: String, afterRank: Int, options: Map<String, Any?>?, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      val pageSize = (options?.get("pageSize") as? Number)?.toInt() ?: DEFAULT_PAGE_SIZE
      val pageToken = options?.get("pageToken") as? String
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

  private companion object {
    const val DEFAULT_FILTER = "none"
    const val DEFAULT_START_AT = "centered-on-viewer"
    const val DEFAULT_PAGE_SIZE = 20
  }

  private inline fun guardAvailability(promise: Promise, earlyReturn: () -> Unit) {
    if (!LeaderboardsUtils.isLeaderboardsSdkAvailable()) {
      promise.reject("SERVICE_UNAVAILABLE", "Leaderboards SDK not available on this build", null)
      earlyReturn()
    }
  }
}
