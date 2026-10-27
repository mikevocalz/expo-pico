package expo.modules.pico.window

import android.content.Context
import android.content.pm.PackageManager

private const val TRANSLUCENT_MAIN_WINDOW = "expo.modules.pico.TRANSLUCENT_MAIN_WINDOW"

/**
 * True when the application meta-data carries the translucent-main-window
 * flag. The config plugin writes it to the PICO flavor manifest only, so it
 * is false on every other build.
 */
internal fun Context.declaresTranslucentMainWindow(): Boolean {
  val info = packageManager.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
  return info.metaData?.getBoolean(TRANSLUCENT_MAIN_WINDOW, false) ?: false
}
