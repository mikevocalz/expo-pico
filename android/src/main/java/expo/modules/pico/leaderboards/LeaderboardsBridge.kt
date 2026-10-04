package expo.modules.pico.leaderboards

import expo.modules.pico.PicoAppContext
import expo.modules.pico.PicoPlatformSDK

/**
 * ILeaderboardClient (PPS 1.0.x):
 *   getLeaderboardArray(String filter) → Task<LeaderboardArray>
 *   getEntries(String name, int filter, int startAt, int page, int pageSize) → Task<LeaderboardEntryArray>
 *   getEntriesByIds(String name, int filter, int startAt, int pageSize, List<String> ids) → ...
 *   getEntriesAfterRank(String name, int page, int pageSize, long afterRank) → ...
 *   writeEntry(String name, long score, byte[] extra, boolean forceUpdate) → Task<Boolean>
 *   writeEntryWithSupplementaryMetric(String, long, long, byte[], boolean) → Task<Boolean>
 *
 * Factory: LeaderboardClient.getLeaderboardClient(Context)
 */
internal object LeaderboardsBridge {
    private val CLIENT = arrayOf("com.pico.pps.sdk.leaderboard.LeaderboardClient")
    private val FACTORY = arrayOf("getLeaderboardClient", "getClient")
    private val EMPTY_EXTRA = ByteArray(0)

    private inline fun ctx(onError: (String, String) -> Unit, block: (android.content.Context) -> Unit) {
        PicoAppContext.get()?.let(block) ?: onError("NO_CONTEXT", "PicoAppContext not initialized")
    }

    fun getAllLeaderboards(
        onSuccess: (List<Map<String, Any?>>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf("getLeaderboardArray"),
            arrayOf<Any?>(""),  // empty filter returns all
            { PicoPlatformSDK.coerceToList(it) }, onSuccess, onError)
    }

    fun writeScore(
        apiName: String, score: Long, extraData: String?, supplementaryMetric: Double?, forceUpdate: Boolean,
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        val extra = extraData?.toByteArray() ?: EMPTY_EXTRA
        val method: String
        val args: Array<Any?>
        if (supplementaryMetric != null) {
            method = "writeEntryWithSupplementaryMetric"
            args = arrayOf<Any?>(apiName, score, supplementaryMetric.toLong(), extra, forceUpdate)
        } else {
            method = "writeEntry"
            args = arrayOf<Any?>(apiName, score, extra, forceUpdate)
        }
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf(method), args,
            { _ -> mapOf<String, Any?>("apiName" to apiName, "score" to score, "written" to true) },
            onSuccess, onError)
    }

    // filter/startAt are PPS JNI enum ints (ppfLeaderboardFilterType / ppfLeaderboardStartAt),
    // read at runtime by LeaderboardQueryArgs. Unknown or unsupported strings reject.
    fun getEntries(
        apiName: String, filter: String, startAt: String, pageSize: Int, pageToken: String?,
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        val filterInt = resolveOrReject(LeaderboardQueryArgs.filter(filter), onError) ?: return@ctx
        val startAtInt = resolveOrReject(LeaderboardQueryArgs.startAt(startAt), onError) ?: return@ctx
        val pageInt = pageToken?.toIntOrNull() ?: 0
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf("getEntries"),
            arrayOf<Any?>(apiName, filterInt, startAtInt, pageInt, pageSize),
            { raw -> PicoPlatformSDK.objectToMap(raw) ?: emptyMap() },
            onSuccess, onError)
    }

    fun getEntriesAfterRank(
        apiName: String, afterRank: Int, pageSize: Int, pageToken: String?,
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        val pageInt = pageToken?.toIntOrNull() ?: 0
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf("getEntriesAfterRank"),
            arrayOf<Any?>(apiName, pageInt, pageSize, afterRank.toLong()),
            { raw -> PicoPlatformSDK.objectToMap(raw) ?: emptyMap() },
            onSuccess, onError)
    }

    // PPS 1.0.x has no dedicated "get my own entry" call. Emulate via getEntries
    // filter=Friend, startAt=CenteredOnViewer and return the first row.
    fun getUserEntry(
        apiName: String, onSuccess: (Map<String, Any?>?) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        // Global board, centered on the viewer, page size 1: the viewer's own row,
        // or an empty page if they have no score yet.
        val global = resolveOrReject(LeaderboardQueryArgs.filter("none"), onError) ?: return@ctx
        val centered = resolveOrReject(LeaderboardQueryArgs.centeredOnViewer(), onError) ?: return@ctx
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf("getEntries"),
            arrayOf<Any?>(apiName, global, centered, 0, 1),  // page=0, pageSize=1
            { raw -> PicoPlatformSDK.coerceToList(raw).firstOrNull() },
            onSuccess, onError)
    }

    private fun resolveOrReject(value: PpsEnumValue, onError: (String, String) -> Unit): Int? =
        when (value) {
            is PpsEnumValue.Resolved -> value.value
            is PpsEnumValue.Rejected -> {
                onError(value.code, value.message)
                null
            }
        }
}
