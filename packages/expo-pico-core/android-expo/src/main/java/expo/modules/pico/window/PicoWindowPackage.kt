package expo.modules.pico.window

import android.content.Context
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener

/** Registers [PicoMainWindowListener] with the app's main activity. */
class PicoWindowPackage : Package {
  override fun createReactActivityLifecycleListeners(activityContext: Context?): List<ReactActivityLifecycleListener> =
    listOf(PicoMainWindowListener())
}
