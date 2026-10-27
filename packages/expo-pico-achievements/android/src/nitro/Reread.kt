package com.margelo.nitro.expopico.achievements

import com.bytedance.pico.platformsdk.message.AchievementDefinition
import com.bytedance.pico.platformsdk.message.AchievementProgress

/**
 * One achievement read back after a write: the raw PPS rows, for counters the
 * JS `Achievement` shape does not carry, plus the joined record. Every field
 * is null when the re-read failed or the name is unknown.
 */
internal data class Reread(
  val definition: AchievementDefinition?,
  val progress: AchievementProgress?,
  val achievement: Achievement?,
) {
  companion object {
    val EMPTY = Reread(definition = null, progress = null, achievement = null)
  }
}
