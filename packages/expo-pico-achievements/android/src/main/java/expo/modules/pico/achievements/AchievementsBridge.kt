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

    fun getAllAchievements(
        onSuccess: (List<Map<String, Any?>>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf("getAllDefinitions"),
            arrayOf<Any?>(0, 50),  // page, pageSize
            { PicoPlatformSDK.coerceToList(it) }, onSuccess, onError)
    }

    fun getProgress(
        apiNames: List<String>, onSuccess: (List<Map<String, Any?>>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf("getProgressByName"),
            arrayOf<Any?>(apiNames.toTypedArray()),  // SDK wants String[]
            { PicoPlatformSDK.coerceToList(it) }, onSuccess, onError)
    }

    fun unlock(
        apiName: String, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf("unlock"),
            arrayOf<Any?>(apiName, EMPTY_EXTRA),
            { raw -> (PicoPlatformSDK.objectToMap(raw) ?: emptyMap()).plus("apiName" to apiName).plus("unlocked" to true) },
            onSuccess, onError)
    }

    fun addCount(
        apiName: String, count: Long, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf("addCount"),
            arrayOf<Any?>(apiName, count, EMPTY_EXTRA),
            { raw -> (PicoPlatformSDK.objectToMap(raw) ?: emptyMap()).plus("apiName" to apiName).plus("count" to count) },
            onSuccess, onError)
    }

    fun addBitfield(
        apiName: String, bits: String, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        // SDK calls this "addFields" — bitfield is encoded as the second String arg.
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf("addFields"),
            arrayOf<Any?>(apiName, bits, EMPTY_EXTRA),
            { raw -> (PicoPlatformSDK.objectToMap(raw) ?: emptyMap()).plus("apiName" to apiName).plus("bits" to bits) },
            onSuccess, onError)
    }
}
