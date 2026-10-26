package expo.modules.pico.window

import android.app.Activity
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import expo.modules.core.interfaces.ReactActivityLifecycleListener

/**
 * Gives the main activity a translucent window with a transparent background
 * on PICO builds, so content drawn beside the main panel, such as a rail or
 * rounded corners, shows passthrough instead of the theme's window color.
 * PICO OS 5 composites a window's alpha, and an activity window cannot be
 * attached beside another, so anything next to the main panel has to be
 * drawn inside this window.
 *
 * Runs only when the PICO flavor manifest carries the flag the
 * @expo-pico/core config plugin writes (option `windows.translucentMainWindow`).
 */
internal class PicoMainWindowListener : ReactActivityLifecycleListener {
  override fun onCreate(activity: Activity, savedInstanceState: Bundle?) {
    apply(activity)
  }

  // The splash screen swaps in the post-splash theme once the first frame is
  // ready, which brings the theme's window background back; apply again
  // after the content changes.
  override fun onContentChanged(activity: Activity) {
    apply(activity)
  }

  private fun apply(activity: Activity) {
    if (!activity.declaresTranslucentMainWindow()) return
    activity.window.setFormat(PixelFormat.TRANSLUCENT)
    activity.window.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
  }
}
