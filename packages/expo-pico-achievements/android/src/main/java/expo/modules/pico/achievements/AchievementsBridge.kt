package expo.modules.pico.achievements

import expo.modules.pico.PicoAppContext
import expo.modules.pico.PicoPlatformSDK

/**
 * IArchievementClient (note: PICO's typo, intentional in their SDK):
 *   addCount(String, long, byte[]) → Task<AchievementUpdate>
 *   unlock(String, byte[]) → Task<AchievementUpdate>
 *   addFields(String, String, byte[]) → Task<AchievementUpdate>
 *   getAllDefinitions(int page, int pageSize) → Task<AchievementDefinitionList>
 *   getDefinitionsByName(String[]) → Task<AchievementDefinitionList>
 *   getProgressByName(String[]) → Task<AchievementProgressList>
 *   getAllProgress(int page, int pageSize) → Task<AchievementProgressList>
 *
 * Factory: AchievementClient.getArchievementClient(Context)  (PICO's typo)
 */
internal object AchievementsBridge {
    private val CLIENT = arrayOf(
        "com.pico.pps.sdk.achievement.AchievementClient",
    )
    private val FACTORY = arrayOf("getArchievementClient", "getAchievementClient", "getClient")
    private val EMPTY_EXTRA = ByteArray(0)

    private inline fun ctx(onError: (String, String) -> Unit, block: (android.content.Context) -> Unit) {
        PicoAppContext.get()?.let(block) ?: onError("NO_CONTEXT", "PicoAppContext not initialized")
    }

    private const val PAGE_SIZE = 50

    // One page of an AchievementDefinitionList / AchievementProgressList: the
    // items plus the wrapper's hasNext flag.
    private fun page(raw: Any?): Pair<List<Map<String, Any?>>, Boolean> =
        PicoPlatformSDK.coerceToList(raw) to (PicoPlatformSDK.objectToMap(raw)?.get("hasNext") == true)

    private fun fetchAllPages(
        c: android.content.Context, method: String, pageIndex: Int, acc: List<Map<String, Any?>>,
        onDone: (List<Map<String, Any?>>) -> Unit, onError: (String, String) -> Unit,
    ) {
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf(method),
            arrayOf<Any?>(pageIndex, PAGE_SIZE),
            ::page,
            { (items, hasNext) ->
                val all = acc + items
                // An empty page with hasNext set would loop forever; stop on it.
                if (hasNext && items.isNotEmpty()) fetchAllPages(c, method, pageIndex + 1, all, onDone, onError)
                else onDone(all)
            },
            onError)
    }

    private fun fetchByName(
        c: android.content.Context, method: String, apiNames: List<String>,
        onDone: (List<Map<String, Any?>>) -> Unit, onError: (String, String) -> Unit,
    ) {
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf(method),
            arrayOf<Any?>(apiNames.toTypedArray()),  // SDK wants String[]
            { PicoPlatformSDK.coerceToList(it) }, onDone, onError)
    }

    /**
     * Definitions joined with progress. Definitions alone have no unlock
     * state, so a definitions-only read can't answer "which are unlocked".
     * `apiNames == null` reads every page of both.
     */
    private fun fetchAchievements(
        c: android.content.Context, apiNames: List<String>?,
        onSuccess: (List<Map<String, Any?>>) -> Unit, onError: (String, String) -> Unit,
    ) {
        val defs: (((List<Map<String, Any?>>) -> Unit) -> Unit) =
            if (apiNames == null) { cb -> fetchAllPages(c, "getAllDefinitions", 0, emptyList(), cb, onError) }
            else { cb -> fetchByName(c, "getDefinitionsByName", apiNames, cb, onError) }
        val progress: (((List<Map<String, Any?>>) -> Unit) -> Unit) =
            if (apiNames == null) { cb -> fetchAllPages(c, "getAllProgress", 0, emptyList(), cb, onError) }
            else { cb -> fetchByName(c, "getProgressByName", apiNames, cb, onError) }
        defs { d -> progress { p -> onSuccess(AchievementMapper.merge(d, p)) } }
    }

    fun getAllAchievements(
        onSuccess: (List<Map<String, Any?>>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c -> fetchAchievements(c, null, onSuccess, onError) }

    fun getUnlockedAchievements(
        onSuccess: (List<Map<String, Any?>>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        fetchAchievements(c, null, { all -> onSuccess(all.filter { it["isUnlocked"] == true }) }, onError)
    }

    fun getProgress(
        apiNames: List<String>, onSuccess: (List<Map<String, Any?>>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c -> fetchAchievements(c, apiNames, onSuccess, onError) }

    /**
     * Runs a write (unlock / addCount / addFields), then re-reads that one
     * achievement so the result carries real counters. AchievementUpdate itself
     * only has `name` and `justUnlocked`.
     */
    private fun write(
        apiName: String, method: String, args: Array<Any?>,
        toResult: (achievement: Map<String, Any?>?, justUnlocked: Boolean) -> Map<String, Any?>,
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit,
    ) = ctx(onError) { c ->
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf(method), args,
            { raw -> PicoPlatformSDK.objectToMap(raw)?.get("justUnlocked") == true },
            { justUnlocked ->
                if (justUnlocked) onUnlocked?.invoke(apiName)
                fetchAchievements(c, listOf(apiName),
                    { list -> onSuccess(toResult(list.firstOrNull(), justUnlocked)) },
                    // The write landed; a failed re-read shouldn't report it as failed.
                    { _, _ -> onSuccess(toResult(null, justUnlocked)) })
            },
            onError)
    }

    /** Set by the module so writes that unlock an achievement emit onAchievementUnlocked. */
    @Volatile var onUnlocked: ((String) -> Unit)? = null

    fun unlock(
        apiName: String, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = write(apiName, "unlock", arrayOf(apiName, EMPTY_EXTRA), { a, just ->
        mapOf(
            "apiName" to apiName,
            "justUnlocked" to just,
            "unlockedAtMs" to ((a?.get("unlockedAtMs") as? Number)?.toLong() ?: System.currentTimeMillis()),
        )
    }, onSuccess, onError)

    fun addCount(
        apiName: String, count: Long, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = write(apiName, "addCount", arrayOf(apiName, count, EMPTY_EXTRA), { a, just ->
        mapOf(
            "apiName" to apiName,
            "currentCount" to ((a?.get("count") as? Number)?.toLong() ?: 0L),
            "targetCount" to ((a?.get("target") as? Number)?.toLong() ?: 0L),
            "justUnlocked" to just,
        )
    }, onSuccess, onError)

    fun addBitfield(
        apiName: String, bits: String, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = write(apiName, "addFields", arrayOf(apiName, bits, EMPTY_EXTRA), { a, just ->
        // SDK calls this "addFields"; the bitfield is the second String arg.
        mapOf(
            "apiName" to apiName,
            "currentBitsSet" to ((a?.get("bitsSet") as? Number)?.toInt() ?: 0),
            "totalBits" to ((a?.get("bitfieldLength") as? Number)?.toLong() ?: bits.length.toLong()),
            "justUnlocked" to just,
        )
    }, onSuccess, onError)
}
