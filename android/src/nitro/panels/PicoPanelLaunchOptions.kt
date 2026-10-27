package expo.modules.pico

import android.app.Activity
import android.app.ActivityOptions
import android.os.Bundle
import android.util.DisplayMetrics

/**
 * The `ActivityOptions` that give a PICO OS 5 panel its own size.
 *
 * PICO OS 5 sizes a third-party app's 2D window from app-wide settings and
 * reads the activity's `<layout>` only for system apps. The one per-launch
 * input it reads is the bundle `pico:activity.data` with `override_app_width`
 * and `override_app_height` in pixels. Both must be positive and must differ.
 *
 * The dp size is converted at the launching window's density, which the new
 * panel's display shares.
 */
internal object PicoPanelLaunchOptions {
  private const val PICO_DATA = "pico:activity.data"
  private const val WIDTH = "override_app_width"
  private const val HEIGHT = "override_app_height"

  fun bundle(source: Activity, widthDp: Int, heightDp: Int): Bundle {
    require(widthDp > 0 && heightDp > 0) { "Panel size must be positive, got ${widthDp}x$heightDp dp." }
    val density = source.resources.displayMetrics.densityDpi
    val width = widthDp * density / DisplayMetrics.DENSITY_DEFAULT
    val height = heightDp * density / DisplayMetrics.DENSITY_DEFAULT
    require(width != height) { "PICO OS ignores a square panel size (${width}x$height px). Make width and height differ." }
    val data = Bundle().apply {
      putInt(WIDTH, width)
      putInt(HEIGHT, height)
    }
    return ActivityOptions.makeBasic().toBundle().apply { putBundle(PICO_DATA, data) }
  }
}
