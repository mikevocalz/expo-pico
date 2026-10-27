package com.margelo.nitro.expopico.achievements

import com.bytedance.pico.platformsdk.jni.ppfAchievementType
import com.bytedance.pico.platformsdk.message.AchievementDefinition
import com.bytedance.pico.platformsdk.message.AchievementProgress

/**
 * Joins PPS `AchievementDefinition` and `AchievementProgress` rows into the JS
 * `Achievement` shape.
 *
 * Definitions carry title, type and target; only progress carries unlock
 * state, so every read needs both. A definition with no progress row is one
 * the player has not touched: unlocked = false, progress = 0.
 */
internal object AchievementMapper {

  /**
   * One `Achievement` per live definition, in definition order. Archived
   * definitions are retired from the catalogue and are dropped.
   */
  fun merge(
    definitions: List<AchievementDefinition>,
    progress: List<AchievementProgress>,
  ): List<Achievement> {
    val progressByName = progress.associateBy { it.name.orEmpty() }
    return definitions.mapNotNull { definition ->
      val name = definition.name
      if (name.isNullOrEmpty() || definition.isArchived) return@mapNotNull null
      toAchievement(definition, progressByName[name])
    }
  }

  private fun toAchievement(definition: AchievementDefinition, row: AchievementProgress?): Achievement {
    val type = typeOf(definition)
    val unlocked = row?.isUnlocked == true
    val description = (if (unlocked) definition.unlockedDescription else null)
      ?.takeIf { it.isNotEmpty() }
      ?: definition.description.orEmpty()
    val icon = if (unlocked) definition.unlockedImageURL else definition.lockedImageURL
    return Achievement(
      apiName = definition.name.orEmpty(),
      title = definition.title.orEmpty(),
      description = description,
      type = type,
      visibility = if (definition.isSecret) {
        AchievementVisibility.HIDDEN
      } else {
        AchievementVisibility.ALWAYS_VISIBLE
      },
      target = if (type == AchievementType.COUNT) definition.target.toDouble() else null,
      bitfieldLength = if (type == AchievementType.BITFIELD) definition.bitfieldLength.toDouble() else null,
      iconUrl = icon?.takeIf { it.isNotEmpty() },
      isUnlocked = unlocked,
      unlockedAtMs = if (unlocked) toEpochMs(row?.unlockTime) else null,
      progress = fractionOf(type, definition, row),
    )
  }

  /** Normalised 0..1 completion, so JS does not have to branch on type. */
  private fun fractionOf(
    type: AchievementType,
    definition: AchievementDefinition,
    row: AchievementProgress?,
  ): Double {
    if (row == null) return 0.0
    if (row.isUnlocked) return 1.0
    return when (type) {
      AchievementType.COUNT -> {
        val target = definition.target
        if (target <= 0L) 0.0 else (row.count.toDouble() / target.toDouble()).coerceIn(0.0, 1.0)
      }
      AchievementType.BITFIELD -> {
        val length = definition.bitfieldLength
        if (length <= 0L) 0.0 else (bitsSet(row.bitfield).toDouble() / length.toDouble()).coerceIn(0.0, 1.0)
      }
      AchievementType.SIMPLE -> 0.0
    }
  }

  /** Number of '1' characters in a PPS bitfield string. */
  fun bitsSet(bitfield: String?): Int = bitfield?.count { it == '1' } ?: 0

  /**
   * `AchievementDefinition.type` is a `ppfAchievementType` int. The real
   * constants are read when the native library is loaded; otherwise the type
   * is inferred from the definition's shape.
   */
  private fun typeOf(definition: AchievementDefinition): AchievementType {
    nativeTypeCodes?.get(definition.type)?.let { return it }
    return when {
      definition.bitfieldLength > 0L -> AchievementType.BITFIELD
      definition.target > 1L -> AchievementType.COUNT
      else -> AchievementType.SIMPLE
    }
  }

  // The ppfAchievementType fields are initialised through JNI, so reading
  // them throws when the PPS native library is absent.
  private val nativeTypeCodes: Map<Int, AchievementType>? by lazy {
    runCatching {
      mapOf(
        ppfAchievementType.ppfAchievement_TypeSimple to AchievementType.SIMPLE,
        ppfAchievementType.ppfAchievement_TypeCount to AchievementType.COUNT,
        ppfAchievementType.ppfAchievement_TypeBitfield to AchievementType.BITFIELD,
      )
    }.getOrNull()
  }

  /**
   * PPS does not document `unlockTime`'s unit. Values below 1e12 cannot be
   * epoch milliseconds after 2001, so they are treated as seconds.
   */
  private fun toEpochMs(raw: Long?): Double? {
    val t = raw?.takeIf { it > 0L } ?: return null
    return if (t < 1_000_000_000_000L) t * 1000.0 else t.toDouble()
  }
}
