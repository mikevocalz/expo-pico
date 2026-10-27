package com.margelo.nitro.expopico.achievements

import com.margelo.nitro.core.Callback
import com.margelo.nitro.core.callAndForget
import com.margelo.nitro.core.Promise
import com.bytedance.pico.platformsdk.message.AchievementDefinition
import com.bytedance.pico.platformsdk.message.AchievementProgress
import com.bytedance.pico.platformsdk.message.AchievementUpdate
import com.pico.pps.sdk.achievement.AchievementClient
import com.pico.pps.sdk.achievement.IArchievementClient
import com.pico.pps.sdk.base.Task

/**
 * `PicoAchievements` backed by `com.pico.pps:platform-service-achievement`.
 *
 * PPS splits achievements across two calls that this API presents as one:
 * `getAllDefinitions` returns the catalogue (title, target, type) and
 * `getAllProgress` returns the player's state against it. An `Achievement`
 * here is a definition joined to its progress row, keyed on `name`; the join
 * lives in `AchievementMapper`.
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

  override fun getAllAchievements(): Promise<Array<Achievement>> {
    val achievements = client
      ?: return Promise.rejected(PicoPps.unavailable("getAllAchievements"))
    return joined(readAll(achievements, "getAllAchievements")) { true }
  }

  /** Unlock state lives on progress rows, so this has to join before it can filter. */
  override fun getUnlockedAchievements(): Promise<Array<Achievement>> {
    val achievements = client
      ?: return Promise.rejected(PicoPps.unavailable("getUnlockedAchievements"))
    return joined(readAll(achievements, "getUnlockedAchievements")) { it.isUnlocked }
  }

  /**
   * Targeted lookup. `getDefinitionsByName` and `getProgressByName` both
   * take the name array directly, so unlike the two calls above this does
   * not page through the whole catalogue.
   */
  override fun getAchievementProgress(apiNames: Array<String>): Promise<Array<Achievement>> {
    val achievements = client
      ?: return Promise.rejected(PicoPps.unavailable("getAchievementProgress"))
    return joined(readByName(achievements, apiNames, "getAchievementProgress")) { true }
  }

  override fun unlockAchievement(apiName: String): Promise<UnlockAchievementResult> {
    val achievements = client
      ?: return Promise.rejected(PicoPps.unavailable("unlockAchievement"))
    // The trailing byte[] is the optional extra-data blob attached to the
    // unlock. Nothing in the TypeScript API exposes it, so it is sent
    // empty rather than invented.
    val task = achievements.unlock(apiName, ByteArray(0))
    return write(achievements, apiName, "unlockAchievement", task) { reread, justUnlocked ->
      UnlockAchievementResult(
        apiName = apiName,
        justUnlocked = justUnlocked,
        unlockedAtMs = reread.achievement?.unlockedAtMs ?: System.currentTimeMillis().toDouble(),
      )
    }
  }

  /**
   * `addCount` reports only `justUnlocked` and the name, not the running
   * total. The current and target counts are read back after the write.
   */
  override fun addAchievementCount(apiName: String, count: Double): Promise<AddCountResult> {
    val achievements = client
      ?: return Promise.rejected(PicoPps.unavailable("addAchievementCount"))
    val task = achievements.addCount(apiName, count.toLong(), ByteArray(0))
    return write(achievements, apiName, "addAchievementCount", task) { reread, justUnlocked ->
      AddCountResult(
        apiName = apiName,
        currentCount = reread.progress?.count?.toDouble() ?: 0.0,
        targetCount = reread.definition?.target?.toDouble() ?: 0.0,
        justUnlocked = justUnlocked,
      )
    }
  }

  /**
   * Bitfield achievements track which bits are set, not how many. PPS
   * takes the new bitfield as a string of '0'/'1' characters through
   * `addFields`; the counts below come from the re-read progress row.
   */
  override fun addAchievementBitfield(
    apiName: String,
    bitfield: String,
  ): Promise<AddBitfieldResult> {
    val achievements = client
      ?: return Promise.rejected(PicoPps.unavailable("addAchievementBitfield"))
    val task = achievements.addFields(apiName, bitfield, ByteArray(0))
    return write(achievements, apiName, "addAchievementBitfield", task) { reread, justUnlocked ->
      AddBitfieldResult(
        apiName = apiName,
        currentBitsSet = AchievementMapper.bitsSet(reread.progress?.bitfield).toDouble(),
        totalBits = reread.definition?.bitfieldLength?.takeIf { it > 0L }?.toDouble()
          ?: bitfield.length.toDouble(),
        justUnlocked = justUnlocked,
      )
    }
  }

  /**
   * PPS pushes no achievement-unlock event: `IArchievementClient` is entirely
   * request/response. Writes made through this object that report
   * `justUnlocked` emit to these listeners instead, so an unlock this app
   * causes is observable. Unlocks made elsewhere (server, another device)
   * are not.
   */
  override fun addAchievementUnlockedListener(
    listener: Callback<(event: AchievementUnlockedEvent) -> Unit>
  ): Double {
    listenerCounter += 1.0
    unlockListeners[listenerCounter] = listener
    return listenerCounter
  }

  override fun removeAchievementUnlockedListener(id: Double) {
    unlockListeners.remove(id)
  }

  private val unlockListeners = mutableMapOf<Double, Callback<(AchievementUnlockedEvent) -> Unit>>()
  private var listenerCounter: Double = 0.0

  private fun emitUnlocked(apiName: String, unlockedAtMs: Double) {
    val event = AchievementUnlockedEvent(apiName = apiName, unlockedAtMs = unlockedAtMs)
    unlockListeners.values.toList().forEach { it.callAndForget(event) }
  }

  /**
   * Runs a write, then re-reads that one achievement so the result carries
   * real state. `AchievementUpdate` itself only has `name` and
   * `justUnlocked`. The write has already landed by the time the re-read
   * runs, so a failed re-read still resolves, with zeroed counters.
   */
  private fun <R> write(
    achievements: IArchievementClient,
    apiName: String,
    label: String,
    task: Task<AchievementUpdate>,
    toResult: (reread: Reread, justUnlocked: Boolean) -> R,
  ): Promise<R> {
    val promise = Promise<R>()
    task.bridge(label) { it.justUnlocked }
      .then { justUnlocked ->
        readByName(achievements, arrayOf(apiName), "$label/reread")
          .then { (definitions, progress) ->
            val reread = Reread(
              definition = definitions.firstOrNull(),
              progress = progress.firstOrNull(),
              achievement = AchievementMapper.merge(definitions, progress).firstOrNull(),
            )
            settleWrite(promise, apiName, justUnlocked, reread, toResult)
          }
          .catch { settleWrite(promise, apiName, justUnlocked, Reread.EMPTY, toResult) }
      }
      .catch { promise.reject(it) }
    return promise
  }

  private fun <R> settleWrite(
    promise: Promise<R>,
    apiName: String,
    justUnlocked: Boolean,
    reread: Reread,
    toResult: (Reread, Boolean) -> R,
  ) {
    try {
      promise.resolve(toResult(reread, justUnlocked))
    } catch (t: Throwable) {
      promise.reject(t)
      return
    }
    if (justUnlocked) {
      emitUnlocked(apiName, reread.achievement?.unlockedAtMs ?: System.currentTimeMillis().toDouble())
    }
  }

  /** Every page of definitions, then every page of progress. */
  private fun readAll(achievements: IArchievementClient, label: String): Promise<Rows> {
    val promise = Promise<Rows>()
    readAllPages { page ->
      achievements.getAllDefinitions(page, PAGE_SIZE).bridge("$label/definitions") {
        it.achievementDefinitionList.orEmpty().toList() to it.hasNext
      }
    }.then { definitions ->
      readAllPages { page ->
        achievements.getAllProgress(page, PAGE_SIZE).bridge("$label/progress") {
          it.achievementProgressList.orEmpty().toList() to it.hasNext
        }
      }.then { progress -> promise.resolve(definitions to progress) }
        .catch { promise.reject(it) }
    }.catch { promise.reject(it) }
    return promise
  }

  /** Definitions and progress rows for the given names. */
  private fun readByName(
    achievements: IArchievementClient,
    apiNames: Array<String>,
    label: String,
  ): Promise<Rows> {
    val promise = Promise<Rows>()
    achievements.getDefinitionsByName(apiNames)
      .bridge("$label/definitions") { it.achievementDefinitionList.orEmpty().toList() }
      .then { definitions ->
        achievements.getProgressByName(apiNames)
          .bridge("$label/progress") { it.achievementProgressList.orEmpty().toList() }
          .then { progress -> promise.resolve(definitions to progress) }
          .catch { promise.reject(it) }
      }
      .catch { promise.reject(it) }
    return promise
  }

  private fun joined(rows: Promise<Rows>, keep: (Achievement) -> Boolean): Promise<Array<Achievement>> {
    val promise = Promise<Array<Achievement>>()
    rows
      .then { (definitions, progress) ->
        try {
          promise.resolve(AchievementMapper.merge(definitions, progress).filter(keep).toTypedArray())
        } catch (t: Throwable) {
          promise.reject(t)
        }
      }
      .catch { promise.reject(it) }
    return promise
  }

  /**
   * Follows the `hasNext` cursor from page 0. An empty page that still
   * claims `hasNext` stops the walk instead of looping forever, and
   * `MAX_PAGES` bounds a server that never clears it.
   */
  private fun <T> readAllPages(fetchPage: (page: Int) -> Promise<Pair<List<T>, Boolean>>): Promise<List<T>> {
    val promise = Promise<List<T>>()
    fun next(page: Int, acc: List<T>) {
      fetchPage(page)
        .then { (items, hasNext) ->
          val all = acc + items
          if (hasNext && items.isNotEmpty() && page + 1 < MAX_PAGES) {
            next(page + 1, all)
          } else {
            promise.resolve(all)
          }
        }
        .catch { promise.reject(it) }
    }
    next(0, emptyList())
    return promise
  }

  // Nitro V1: the spec bridge reads this Companion (backs JS `new PicoAchievements()`).
  companion object : HybridPicoAchievementsSpec.Companion {
    override fun constructor(): HybridPicoAchievements = HybridPicoAchievements()

    /** Kept in step with `PPS_VERSION` in `plugin/src/ppsArtifacts.ts`. */
    const val PPS_VERSION = "1.0.0"

    /** `getAllDefinitions` / `getAllProgress` page size. `hasNext` is followed. */
    const val PAGE_SIZE = 50

    /** Upper bound on pages followed per read. */
    const val MAX_PAGES = 200
  }
}

private typealias Rows = Pair<List<AchievementDefinition>, List<AchievementProgress>>
