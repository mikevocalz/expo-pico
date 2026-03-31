package expo.modules.pico.achievements

/**
 * AchievementsBridge isolates all PICO Platform SDK achievements calls.
 *
 * Achievement types:
 * - simple: unlock once, no progress tracking
 * - count: increment a counter, unlocks at target value
 * - bitfield: set individual bits, unlocks when all bits are set
 *
 * Threading: All functions called from AsyncFunction background threads.
 *
 * See: https://developer.picoxr.com/document/unity/achievements/
 */
internal object AchievementsBridge {

  @Volatile
  var moduleRef: ExpoPicoAchievementsModule? = null

  fun getAllAchievements(
    onSuccess: (List<Map<String, Any?>>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   AchievementsAPI.getAllDefinitions { result ->
    //     if (result.isSuccess) onSuccess(result.achievements.map { a ->
    //       mapOf(
    //         "apiName"        to a.apiName,
    //         "title"          to a.title,
    //         "description"    to a.description,
    //         "type"           to a.type.name.lowercase(),
    //         "visibility"     to a.policy.name.lowercase().replace("_", "-"),
    //         "target"         to a.target,
    //         "bitfieldLength" to a.bitfieldLength,
    //         "iconUrl"        to a.iconUrl,
    //         "isUnlocked"     to a.isUnlocked,
    //         "unlockedAtMs"   to a.unlockedAt?.time,
    //         "progress"       to a.progress
    //       )
    //     })
    //     else onError("UNKNOWN", result.errorMessage ?: "getAllAchievements failed")
    //   }
    onError("NOT_IMPLEMENTED", "getAllAchievements: Achievements SDK not yet linked.")
  }

  fun getProgress(
    apiNames: List<String>,
    onSuccess: (List<Map<String, Any?>>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): AchievementsAPI.getProgressByName(apiNames) { ... }
    onError("NOT_IMPLEMENTED", "getAchievementProgress: Achievements SDK not yet linked.")
  }

  fun unlock(
    apiName: String,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   AchievementsAPI.unlock(apiName) { result ->
    //     if (result.isSuccess) onSuccess(mapOf(
    //       "apiName"      to apiName,
    //       "justUnlocked" to result.justUnlocked,
    //       "unlockedAtMs" to System.currentTimeMillis()
    //     ))
    //     else onError("UNKNOWN", result.errorMessage ?: "unlockAchievement failed")
    //   }
    onError("NOT_IMPLEMENTED", "unlockAchievement: Achievements SDK not yet linked.")
  }

  fun addCount(
    apiName: String,
    count: Int,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): AchievementsAPI.addCount(apiName, count) { ... }
    onError("NOT_IMPLEMENTED", "addAchievementCount: Achievements SDK not yet linked.")
  }

  fun addBitfield(
    apiName: String,
    bits: String,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): AchievementsAPI.addBitField(apiName, bits) { ... }
    onError("NOT_IMPLEMENTED", "addAchievementBitfield: Achievements SDK not yet linked.")
  }
}
