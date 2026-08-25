package com.margelo.nitro.expopico.achievements

import com.margelo.nitro.core.Promise
import com.bytedance.pico.platformsdk.message.AchievementDefinition
import com.bytedance.pico.platformsdk.message.AchievementProgress
import com.pico.pps.sdk.achievement.AchievementClient
import com.pico.pps.sdk.achievement.IArchievementClient

/**
 * `PicoAchievements` backed by `com.pico.pps:platform-service-achievement`.
 *
 * PPS splits achievements across two calls that this API presents as one:
 * `getAllDefinitions` returns the catalogue (title, target, type) and
 * `getAllProgress` returns the player's state against it. An `Achievement`
 * here is a definition joined to its progress row, keyed on `name`.
 *
 * Note the interface really is spelled `IArchievementClient` in the
 * published artifact. That is a typo upstream, not here.
 */
class HybridPicoAchievements : HybridPicoAchievementsSpec() {

  private val client: IArchievementClient?
    get() {
      if (!PicoPps.sdkPresent) return null
      val context = PicoPps.context() ?: return null
      return try {
        AchievementClient.getArchievementClient(context)
      } catch (_: Throwable) {
        null
      }
    }

  override val available: Boolean
    get() = client != null

  override val sdkVersion: String
    get() = if (PicoPps.sdkPresent) PPS_VERSION else ""

  override fun getAllAchievements(): Promise<Array<Achievement>> =
    joinDefinitionsWithProgress("getAllAchievements") { true }

  override fun getUnlockedAchievements(): Promise<Array<Achievement>> =
    joinDefinitionsWithProgress("getUnlockedAchievements") { it?.isUnlocked == true }

  /**
   * Targeted lookup. `getDefinitionsByName` and `getProgressByName` both
   * take the name array directly, so unlike the two calls above this does
   * not page through the whole catalogue.
   */
  override fun getAchievementProgress(apiNames: Array<String>): Promise<Array<Achievement>> {
    val achievements = client
      ?: return Promise.rejected(PicoPps.unavailable("getAchievementProgress"))
    val promise = Promise<Array<Achievement>>()
    achievements.getDefinitionsByName(apiNames)
      .bridge("getAchievementProgress/definitions") { it.achievementDefinitionList.orEmpty().toList() }
      .then { definitions ->
        achievements.getProgressByName(apiNames)
          .bridge("getAchievementProgress/progress") { it.achievementProgressList.orEmpty().toList() }
          .then { progress -> promise.resolve(join(definitions, progress) { true }) }
          .catch { promise.reject(it) }
      }
      .catch { promise.reject(it) }
    return promise
  }

  override fun unlockAchievement(apiName: String): Promise<UnlockAchievementResult> {
    val achievements = client
      ?: return Promise.rejected(PicoPps.unavailable("unlockAchievement"))
    // The trailing byte[] is the optional extra-data blob attached to the
    // unlock. Nothing in the TypeScript API exposes it, so it is sent
    // empty rather than invented.
    return achievements.unlock(apiName, ByteArray(0)).bridge("unlockAchievement") { update ->
      UnlockAchievementResult(
        apiName = update.name.orEmpty(),
        justUnlocked = update.justUnlocked,
        unlockedAtMs = System.currentTimeMillis().toDouble(),
      )
    }
  }

  /**
   * `addCount` reports only `justUnlocked` and the name — not the running
   * total. Rather than return a count this call never saw, the current and
   * target counts are read back from the definition and progress rows
   * after the write lands.
   */
  override fun addAchievementCount(apiName: String, count: Double): Promise<AddCountResult> {
    val achievements = client
      ?: return Promise.rejected(PicoPps.unavailable("addAchievementCount"))
    val promise = Promise<AddCountResult>()
    val names = arrayOf(apiName)
    achievements.addCount(apiName, count.toLong(), ByteArray(0))
      .bridge("addAchievementCount") { it.justUnlocked }
      .then { justUnlocked ->
        achievements.getProgressByName(names)
          .bridge("addAchievementCount/progress") { it.achievementProgressList.orEmpty().toList() }
          .then { progress ->
            achievements.getDefinitionsByName(names)
              .bridge("addAchievementCount/definition") {
                it.achievementDefinitionList.orEmpty().toList()
              }
              .then { definitions ->
                promise.resolve(
                  AddCountResult(
                    apiName = apiName,
                    currentCount = progress.firstOrNull()?.count?.toDouble() ?: 0.0,
                    targetCount = definitions.firstOrNull()?.target?.toDouble() ?: 0.0,
                    justUnlocked = justUnlocked,
                  )
                )
              }
              .catch { promise.reject(it) }
          }
          .catch { promise.reject(it) }
      }
      .catch { promise.reject(it) }
    return promise
  }

  /**
   * Bitfield achievements track which bits are set, not how many. PPS
   * takes the new bitfield as a string of '0'/'1' characters through
   * `addFields`, and reports the result the same way, so the counts below
   * are derived from the returned bitfield rather than guessed.
   */
  override fun addAchievementBitfield(
    apiName: String,
    bitfield: String,
  ): Promise<AddBitfieldResult> {
    val achievements = client
      ?: return Promise.rejected(PicoPps.unavailable("addAchievementBitfield"))
    val promise = Promise<AddBitfieldResult>()
    val names = arrayOf(apiName)
    achievements.addFields(apiName, bitfield, ByteArray(0))
      .bridge("addAchievementBitfield") { it.justUnlocked }
      .then { justUnlocked ->
        achievements.getProgressByName(names)
          .bridge("addAchievementBitfield/progress") {
            it.achievementProgressList.orEmpty().toList()
          }
          .then { progress ->
            achievements.getDefinitionsByName(names)
              .bridge("addAchievementBitfield/definition") {
                it.achievementDefinitionList.orEmpty().toList()
              }
              .then { definitions ->
                val bits = progress.firstOrNull()?.bitfield.orEmpty()
                promise.resolve(
                  AddBitfieldResult(
                    apiName = apiName,
                    currentBitsSet = bits.count { c -> c == '1' }.toDouble(),
                    totalBits = definitions.firstOrNull()?.bitfieldLength?.toDouble()
                      ?: bits.length.toDouble(),
                    justUnlocked = justUnlocked,
                  )
                )
              }
              .catch { promise.reject(it) }
          }
          .catch { promise.reject(it) }
      }
      .catch { promise.reject(it) }
    return promise
  }

  /**
   * PPS pushes no achievement-unlock event.
   *
   * `IArchievementClient` is entirely request/response — there is no
   * receiver, listener or broadcast on it. Registration succeeds and
   * returns a real id so JS subscribe/unsubscribe code does not have to
   * special-case this package, but nothing is ever emitted. Callers that
   * need to react to an unlock should use the `justUnlocked` flag that
   * every write returns.
   */
  override fun addAchievementUnlockedListener(
    listener: (event: AchievementUnlockedEvent) -> Unit
  ): Double {
    listenerCounter += 1.0
    return listenerCounter
  }

  override fun removeAchievementUnlockedListener(id: Double): Unit = Unit

  private var listenerCounter: Double = 0.0

  /** Page through the whole catalogue, then join it to the whole progress list. */
  private fun joinDefinitionsWithProgress(
    label: String,
    keep: (AchievementProgress?) -> Boolean,
  ): Promise<Array<Achievement>> {
    val achievements = client ?: return Promise.rejected(PicoPps.unavailable(label))
    val promise = Promise<Array<Achievement>>()
    achievements.getAllDefinitions(0, PAGE_SIZE)
      .bridge("$label/definitions") { it.achievementDefinitionList.orEmpty().toList() }
      .then { definitions ->
        achievements.getAllProgress(0, PAGE_SIZE)
          .bridge("$label/progress") { it.achievementProgressList.orEmpty().toList() }
          .then { progress -> promise.resolve(join(definitions, progress, keep)) }
          .catch { promise.reject(it) }
      }
      .catch { promise.reject(it) }
    return promise
  }

  private fun join(
    definitions: List<AchievementDefinition>,
    progress: List<AchievementProgress>,
    keep: (AchievementProgress?) -> Boolean,
  ): Array<Achievement> {
    val progressByName = progress.associateBy { it.name.orEmpty() }
    return definitions.mapNotNull { definition ->
      val name = definition.name.orEmpty()
      // A definition with no progress row is one the player has not
      // touched: unlocked = false, progress = 0. That is a real state, not
      // missing data, so the predicate is given the null and decides.
      val row = progressByName[name]
      if (!keep(row)) return@mapNotNull null
      Achievement(
        apiName = name,
        title = definition.title.orEmpty(),
        description = definition.description.orEmpty(),
        type = definition.type.toAchievementType(),
        visibility = if (definition.isSecret) {
          AchievementVisibility.HIDDEN
        } else {
          AchievementVisibility.ALWAYS_VISIBLE
        },
        target = definition.target.takeIf { it > 0L }?.toDouble(),
        bitfieldLength = definition.bitfieldLength.takeIf { it > 0L }?.toDouble(),
        // PPS carries no icon URL on the definition.
        iconUrl = null,
        isUnlocked = row?.isUnlocked ?: false,
        unlockedAtMs = row?.unlockTime?.takeIf { it > 0L }?.let { it * 1000.0 },
        progress = fractionOf(definition, row),
      )
    }.toTypedArray()
  }

  /** Normalised 0..1 completion, so JS does not have to branch on type. */
  private fun fractionOf(definition: AchievementDefinition, row: AchievementProgress?): Double {
    if (row == null) return 0.0
    if (row.isUnlocked) return 1.0
    return when (definition.type.toAchievementType()) {
      AchievementType.COUNT -> {
        val target = definition.target
        if (target <= 0L) 0.0 else (row.count.toDouble() / target.toDouble()).coerceIn(0.0, 1.0)
      }
      AchievementType.BITFIELD -> {
        val bits = row.bitfield.orEmpty()
        val total = definition.bitfieldLength.takeIf { it > 0L }?.toDouble()
          ?: bits.length.toDouble()
        if (total <= 0.0) 0.0 else (bits.count { it == '1' } / total).coerceIn(0.0, 1.0)
      }
      AchievementType.SIMPLE -> 0.0
    }
  }

  private companion object {
    /** Kept in step with `PPS_VERSION` in `plugin/src/ppsArtifacts.ts`. */
    const val PPS_VERSION = "1.0.0"

    /**
     * `getAllDefinitions` / `getAllProgress` are paged (offset, size).
     * A title with more than this many achievements would need the
     * `hasNext` cursor followed; the TypeScript API has no pagination
     * surface to expose that through, so the first page is what is
     * returned. 1000 is far above any real achievement catalogue.
     */
    const val PAGE_SIZE = 1000

    /**
     * `AchievementDefinition.type` is a bare `int`. The three values line
     * up with the SIMPLE / COUNT / BITFIELD ordering the TypeScript enum
     * already uses; anything unrecognised falls back to SIMPLE rather than
     * throwing, so one odd definition cannot fail the whole catalogue.
     */
    fun Int.toAchievementType(): AchievementType = when (this) {
      1 -> AchievementType.COUNT
      2 -> AchievementType.BITFIELD
      else -> AchievementType.SIMPLE
    }
  }
}
