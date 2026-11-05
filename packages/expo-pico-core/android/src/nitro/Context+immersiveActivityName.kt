package com.margelo.nitro.expopico.picocore

import android.content.Context
import android.content.pm.PackageManager

/**
 * Activity-level meta-data the @expo-pico/core config plugin puts on the
 * renderer's immersive activity (Viro's `.VRActivity`). Must match
 * `IMMERSIVE_ACTIVITY_META` in `plugin/src/launcherTiles.ts`.
 */
internal const val IMMERSIVE_ACTIVITY_META = "expo.modules.pico.IMMERSIVE_ACTIVITY"

/**
 * Class name of this app's immersive activity, or null when none is marked.
 *
 * Read from the plugin's marker rather than from an intent filter: the
 * one-launcher-tile rules strip or rename the immersive activity's filters
 * so it never shows as a second library tile, and a filter lookup then finds
 * nothing (device QA 2026-11-04: Enter XR fell back to the inline scene on a
 * Quest 3S).
 */
internal fun Context.immersiveActivityName(): String? {
  val info = try {
    packageManager.getPackageInfo(
      packageName,
      PackageManager.GET_ACTIVITIES or PackageManager.GET_META_DATA,
    )
  } catch (_: PackageManager.NameNotFoundException) {
    return null
  }
  return info.activities.orEmpty()
    .firstOrNull { it.metaData?.getBoolean(IMMERSIVE_ACTIVITY_META, false) == true }
    ?.name
}
