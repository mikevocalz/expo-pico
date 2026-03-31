package expo.modules.pico.leaderboards

/**
 * LeaderboardsBridge isolates all PICO Platform SDK leaderboard calls.
 *
 * Leaderboards are stateless — no session state, no push events.
 * All operations are request/response: query or write, then return result.
 *
 * Pagination: uses nextPageToken / previousPageToken strings (server-side cursor).
 * Pass nextPageToken as pageToken in the next call to get the following page.
 *
 * Threading: All functions called from AsyncFunction background threads.
 *
 * See: https://developer.picoxr.com/document/unity/leaderboards/
 */
internal object LeaderboardsBridge {

  fun getAllLeaderboards(
    onSuccess: (List<Map<String, Any?>>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   LeaderboardAPI.getLeaderboards { result ->
    //     if (result.isSuccess) onSuccess(result.leaderboards.map { lb ->
    //       mapOf("apiName" to lb.apiName, "title" to lb.title, "sortOrder" to lb.sortOrder.name.lowercase())
    //     })
    //     else onError("UNKNOWN", result.errorMessage ?: "getAllLeaderboards failed")
    //   }
    onError("NOT_IMPLEMENTED", "getAllLeaderboards: Leaderboards SDK not yet linked.")
  }

  fun writeScore(
    apiName: String,
    score: Long,
    extraData: String?,
    supplementaryMetric: Double?,
    forceUpdate: Boolean,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   val entry = LeaderboardEntry.Builder(score)
    //     .extraData(extraData)
    //     .supplementaryMetric(supplementaryMetric)
    //     .forceUpdate(forceUpdate)
    //     .build()
    //   LeaderboardAPI.writeEntry(apiName, entry) { result ->
    //     if (result.isSuccess) onSuccess(mapOf(
    //       "apiName"       to apiName,
    //       "didUpdate"     to result.didUpdate,
    //       "previousScore" to result.previousScore,
    //       "newScore"      to score,
    //       "newRank"       to result.rank
    //     ))
    //     else onError("UNKNOWN", result.errorMessage ?: "writeScore failed")
    //   }
    onError("NOT_IMPLEMENTED", "writeScore: Leaderboards SDK not yet linked.")
  }

  fun getEntries(
    apiName: String,
    filter: String,
    startAt: String,
    pageSize: Int,
    pageToken: String?,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   LeaderboardAPI.getEntries(apiName, filter, startAt, pageSize, pageToken) { result ->
    //     if (result.isSuccess) onSuccess(mapOf(
    //       "items"         to result.entries.map { it.toMap() },
    //       "nextPageToken" to result.nextPageToken,
    //       "totalCount"    to result.totalCount
    //     ))
    //     else onError("UNKNOWN", result.errorMessage ?: "getEntries failed")
    //   }
    onError("NOT_IMPLEMENTED", "getEntries: Leaderboards SDK not yet linked.")
  }

  fun getEntriesAfterRank(
    apiName: String,
    afterRank: Int,
    pageSize: Int,
    pageToken: String?,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): LeaderboardAPI.getEntriesAfterRank(apiName, afterRank, pageSize, pageToken) { ... }
    onError("NOT_IMPLEMENTED", "getEntriesAfterRank: Leaderboards SDK not yet linked.")
  }

  fun getUserEntry(
    apiName: String,
    onSuccess: (Map<String, Any?>?) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): LeaderboardAPI.getUserEntry(apiName) { result -> onSuccess(result?.toMap()) }
    onError("NOT_IMPLEMENTED", "getUserEntry: Leaderboards SDK not yet linked.")
  }
}
