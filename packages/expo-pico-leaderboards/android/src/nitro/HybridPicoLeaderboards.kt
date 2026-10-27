package com.margelo.nitro.expopico.leaderboards

import com.margelo.nitro.core.Promise
import com.bytedance.pico.platformsdk.message.LeaderboardEntryArray
import com.pico.pps.sdk.leaderboard.ILeaderboardClient
import com.pico.pps.sdk.leaderboard.LeaderboardClient

/**
 * `PicoLeaderboards` backed by `com.pico.pps:platform-service-leaderboard`.
 *
 * Two things about the PPS surface shape this file:
 *
 * - `getEntries(name, pageSize, pageIdx, filter, startAt)` takes filter and
 *   start-at as PPS JNI enum ints, which `LeaderboardQueryArgs` reads at
 *   runtime. Page size comes before page index in all three entry reads.
 * - Pagination is by page index, not an opaque cursor. The
 *   `nextPageToken` this API returns is therefore the next page index as a
 *   string, and `pageToken` is parsed back out of it. That keeps the JS
 *   contract stable if PPS later moves to real cursors.
 */
class HybridPicoLeaderboards : HybridPicoLeaderboardsSpec() {

  private val client: ILeaderboardClient?
    get() {
      if (!PicoPps.sdkPresent) return null
      val context = PicoPps.context() ?: return null
      return try {
        LeaderboardClient.getLeaderboardClient(context)
      } catch (_: Throwable) {
        null
      }
    }

  override val available: Boolean
    get() = client != null

  override val sdkVersion: String
    get() = if (PicoPps.sdkPresent) PPS_VERSION else ""

  /**
   * `getLeaderboardArray` takes the API name to look up. An empty string
   * asks for every leaderboard the title declares.
   */
  override fun getAllLeaderboards(): Promise<Array<Leaderboard>> {
    val leaderboards = client
      ?: return Promise.rejected(PicoPps.unavailable("getAllLeaderboards"))
    return leaderboards.getLeaderboardArray("").bridge("getAllLeaderboards") { array ->
      array.leaderboardList.orEmpty().map { board ->
        Leaderboard(
          apiName = board.apiName.orEmpty(),
          // PPS carries no separate title on the leaderboard record; the
          // destination display name is the closest human-readable label,
          // and the API name is the fallback.
          title = board.destinationDisplayName ?: board.apiName.orEmpty(),
          // Sort order lives in the developer console, not in the payload.
          // Descending is the PICO default for score leaderboards.
          sortOrder = LeaderboardSortOrder.DESCENDING,
        )
      }.toTypedArray()
    }
  }

  override fun getEntries(
    apiName: String,
    options: GetEntriesOptions?,
  ): Promise<LeaderboardEntryPage> {
    val leaderboards = client ?: return Promise.rejected(PicoPps.unavailable("getEntries"))
    val pageIdx = options?.pageToken?.toIntOrNull() ?: 0
    val pageSize = options?.pageSize?.toInt() ?: DEFAULT_PAGE_SIZE
    val filter: Int
    val startAt: Int
    try {
      filter = LeaderboardQueryArgs.filter(options?.filter)
      startAt = LeaderboardQueryArgs.startAt(options?.startAt)
    } catch (t: Throwable) {
      return Promise.rejected(t)
    }
    return leaderboards
      .getEntries(apiName, pageSize, pageIdx, filter, startAt)
      .bridge("getEntries") { it.toPage(pageIdx) }
  }

  override fun getEntriesAfterRank(
    apiName: String,
    afterRank: Double,
    options: GetEntriesOptions?,
  ): Promise<LeaderboardEntryPage> {
    val leaderboards = client
      ?: return Promise.rejected(PicoPps.unavailable("getEntriesAfterRank"))
    val pageIdx = options?.pageToken?.toIntOrNull() ?: 0
    val pageSize = options?.pageSize?.toInt() ?: DEFAULT_PAGE_SIZE
    return leaderboards
      .getEntriesAfterRank(apiName, pageSize, pageIdx, afterRank.toLong())
      .bridge("getEntriesAfterRank") { it.toPage(pageIdx) }
  }

  /**
   * The signed-in player's row: the global board, centered on the viewer,
   * one entry per page. A player with no score yet gets an empty page, so
   * this resolves `undefined`.
   */
  override fun getUserEntry(apiName: String): Promise<LeaderboardEntry?> {
    val leaderboards = client ?: return Promise.rejected(PicoPps.unavailable("getUserEntry"))
    val viewerRow = try {
      viewerRow(leaderboards, apiName)
    } catch (t: Throwable) {
      return Promise.rejected(t)
    }
    return viewerRow.bridge("getUserEntry") { array ->
      array.entryList.orEmpty().firstOrNull()?.toEntry(isCurrentUser = true)
    }
  }

  private fun viewerRow(leaderboards: ILeaderboardClient, apiName: String) =
    leaderboards.getEntries(
      apiName,
      1,
      0,
      LeaderboardQueryArgs.filter(LeaderboardFilter.NONE),
      LeaderboardQueryArgs.startAt(LeaderboardStartAt.CENTERED_ON_VIEWER),
    )

  /**
   * Writes a score, then reads the row back to report the new rank.
   *
   * `writeEntry` returns a bare `Boolean` — whether the score was
   * accepted — and nothing else. Reporting `newRank` without the read-back
   * would mean inventing it, and `previousScore` is genuinely not
   * recoverable after the write, so it is reported as null rather than
   * guessed.
   */
  override fun writeScore(
    apiName: String,
    score: Double,
    options: WriteScoreOptions?,
  ): Promise<WriteScoreResult> {
    val leaderboards = client ?: return Promise.rejected(PicoPps.unavailable("writeScore"))
    val extra = options?.extraData?.toByteArray() ?: ByteArray(0)
    val force = options?.forceUpdate ?: false
    val supplementary = options?.supplementaryMetric

    // PPS splits this into two methods rather than taking an optional
    // metric, so the choice is made here.
    val write = if (supplementary != null) {
      leaderboards.writeEntryWithSupplementaryMetric(
        apiName,
        score.toLong(),
        supplementary.toLong(),
        extra,
        force,
      )
    } else {
      leaderboards.writeEntry(apiName, score.toLong(), extra, force)
    }

    val promise = Promise<WriteScoreResult>()
    write
      .bridge("writeScore") { accepted -> accepted }
      .then { accepted ->
        val readback = try {
          viewerRow(leaderboards, apiName)
        } catch (t: Throwable) {
          promise.reject(t)
          return@then
        }
        readback
          .bridge("writeScore/readback") { array ->
            array.entryList.orEmpty().firstOrNull()
          }
          .then { row ->
            promise.resolve(
              WriteScoreResult(
                apiName = apiName,
                didUpdate = accepted,
                previousScore = null,
                newScore = row?.score?.toDouble() ?: score,
                newRank = row?.rank?.toDouble(),
              )
            )
          }
          .catch { promise.reject(it) }
      }
      .catch { promise.reject(it) }
    return promise
  }

  private fun LeaderboardEntryArray.toPage(pageIdx: Int): LeaderboardEntryPage =
    LeaderboardEntryPage(
      items = entryList.orEmpty().map { it.toEntry(isCurrentUser = false) }.toTypedArray(),
      nextPageToken = if (hasNext) (pageIdx + 1).toString() else null,
      totalCount = totalCount.toDouble(),
    )

  private fun com.bytedance.pico.platformsdk.message.LeaderboardEntry.toEntry(
    isCurrentUser: Boolean,
  ): LeaderboardEntry =
    LeaderboardEntry(
      rank = rank.toDouble(),
      score = score.toDouble(),
      supplementaryMetric = supplementaryMetric.takeIf { it != 0L }?.toDouble(),
      extraData = extraData?.takeIf { it.isNotEmpty() }?.toString(Charsets.UTF_8),
      userId = user?.id.orEmpty(),
      displayName = user?.displayName.orEmpty(),
      isCurrentUser = isCurrentUser,
      // PPS reports entry timestamps in seconds.
      updatedAtMs = timestamp * 1000.0,
    )

  // Nitro V1: the spec bridge reads this Companion (backs JS `new PicoLeaderboards()`).
  companion object : HybridPicoLeaderboardsSpec.Companion {
    override fun constructor(): HybridPicoLeaderboards = HybridPicoLeaderboards()

    /** Kept in step with `PPS_VERSION` in `plugin/src/ppsArtifacts.ts`. */
    const val PPS_VERSION = "1.0.0"

    /** Page size when `GetEntriesOptions.pageSize` is not set. */
    const val DEFAULT_PAGE_SIZE = 20
  }
}
