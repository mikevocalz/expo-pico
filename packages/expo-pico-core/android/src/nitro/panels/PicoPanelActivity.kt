package expo.modules.pico

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import com.facebook.react.ReactApplication
import com.facebook.react.interfaces.fabric.ReactSurface
import com.margelo.nitro.expopico.picocore.PanelCloseReason

/**
 * A PICO panel that renders one registered React Native component as a
 * second surface on the app's ReactHost, so it shares the main window's JS
 * runtime and module state.
 *
 * The @expo-pico/core config plugin declares it in the PICO flavor manifest
 * with a `pico.vr.position` no other activity uses: PICO OS 5 gives it a
 * window of its own only because that value differs from the main
 * activity's. Its size comes from the launch ([PicoPanelLaunchOptions]);
 * where it opens is up to the OS.
 *
 * Not a `ReactActivity`: ReactHost tracks one current activity, asserts in
 * `onHostPause` when a different one pauses, and tears the React context down
 * when the current activity is destroyed. This activity reports no host
 * lifecycle, so the main window stays the ReactHost's activity throughout.
 */
class PicoPanelActivity : ComponentActivity() {
  private var surface: ReactSurface? = null
  private var componentName: String? = null
  private var closeReason = PanelCloseReason.USER

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val name = intent.getStringExtra(EXTRA_COMPONENT)
    val host = (application as? ReactApplication)?.reactHost
    if (name.isNullOrEmpty() || host == null) {
      Log.e(TAG, "Cannot open a panel: component=$name, reactHost=${host != null}.")
      finishAndRemoveTask()
      return
    }
    componentName = name

    // PICO OS 5 composites window alpha and rounds no third-party window, so
    // the content's own shape is the panel's shape.
    window.setFormat(PixelFormat.TRANSLUCENT)
    window.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

    val created = host.createSurface(this, name, intent.getBundleExtra(EXTRA_PROPS))
    val view = checkNotNull(created.view) { "ReactHost.createSurface returned a surface without a view." }
    view.setBackgroundColor(Color.TRANSPARENT)
    setContentView(
      view,
      ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT),
    )
    created.start()
    surface = created

    // Back closes the panel; the ReactHost's back handling belongs to the
    // main window.
    onBackPressedDispatcher.addCallback(
      this,
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          finishAndRemoveTask()
        }
      },
    )

    PicoPanelRegistry.opened(name, this)
  }

  /** Closes this panel at JS's request; the close event reports `app`. */
  internal fun closeFromApp() {
    closeReason = PanelCloseReason.APP
    finishAndRemoveTask()
  }

  override fun onDestroy() {
    surface?.let {
      it.stop()
      it.detach()
    }
    surface = null
    componentName?.let { PicoPanelRegistry.closed(it, this, closeReason) }
    super.onDestroy()
  }

  companion object {
    private const val TAG = "PicoPanelActivity"
    private const val EXTRA_COMPONENT = "expo.modules.pico.panel.COMPONENT"
    private const val EXTRA_PROPS = "expo.modules.pico.panel.PROPS"

    /**
     * Android's multi-window launch: `FLAG_ACTIVITY_LAUNCH_ADJACENT |
     * FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_MULTIPLE_TASK`.
     */
    internal fun intent(context: Context, componentName: String, props: Bundle): Intent =
      Intent(context, PicoPanelActivity::class.java)
        .putExtra(EXTRA_COMPONENT, componentName)
        .putExtra(EXTRA_PROPS, props)
        .addFlags(
          Intent.FLAG_ACTIVITY_LAUNCH_ADJACENT or
            Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_MULTIPLE_TASK,
        )
  }
}
