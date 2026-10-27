package com.margelo.nitro.expopico.picocore

import android.os.Bundle
import com.margelo.nitro.core.Callback
import com.margelo.nitro.core.Promise
import com.margelo.nitro.core.callAndForget
import expo.modules.pico.MainThreadExecutor
import expo.modules.pico.PicoActivityHolder
import expo.modules.pico.PicoPanelActivity
import expo.modules.pico.PicoPanelLaunchOptions
import expo.modules.pico.PicoPanelObserver
import expo.modules.pico.PicoPanelRegistry
import java.util.concurrent.CopyOnWriteArraySet

/**
 * `PicoPanelHost`: opens and closes [PicoPanelActivity] panels and forwards
 * their lifecycle to JS listeners. Panel work runs on the main thread.
 */
class HybridPicoPanelHost : HybridPicoPanelHostSpec() {
  private val openedListeners = CopyOnWriteArraySet<Callback<(event: PanelOpenedEvent) -> Unit>>()
  private val closedListeners = CopyOnWriteArraySet<Callback<(event: PanelClosedEvent) -> Unit>>()

  private val observer =
    object : PicoPanelObserver {
      override fun onPanelOpened(name: String) {
        val event = PanelOpenedEvent(name)
        for (listener in openedListeners) listener.callAndForget(event)
      }

      override fun onPanelClosed(name: String, reason: PanelCloseReason) {
        val event = PanelClosedEvent(name, reason)
        for (listener in closedListeners) listener.callAndForget(event)
      }
    }

  init {
    PicoPanelRegistry.addObserver(observer)
  }

  override fun openPanel(name: String, size: PanelSizeDp, props: Map<String, String>?): Promise<Unit> =
    Promise.parallel(MainThreadExecutor) {
      if (PicoPanelRegistry.find(name) != null) return@parallel
      val activity =
        PicoActivityHolder.currentActivity()
          ?: throw Error("Cannot open panel $name: the app has no current activity to launch it from.")
      val bundle = Bundle()
      props?.forEach { (key, value) -> bundle.putString(key, value) }
      val options = PicoPanelLaunchOptions.bundle(activity, size.widthDp.toInt(), size.heightDp.toInt())
      activity.startActivity(PicoPanelActivity.intent(activity, name, bundle), options)
    }

  override fun closePanel(name: String): Promise<Unit> =
    Promise.parallel(MainThreadExecutor) {
      PicoPanelRegistry.find(name)?.closeFromApp()
      Unit
    }

  override fun addOnPanelOpenedListener(listener: Callback<(event: PanelOpenedEvent) -> Unit>): ListenerSubscription {
    openedListeners.add(listener)
    return ListenerSubscription(Callback.Arity0<Unit> { openedListeners.remove(listener) })
  }

  override fun addOnPanelClosedListener(listener: Callback<(event: PanelClosedEvent) -> Unit>): ListenerSubscription {
    closedListeners.add(listener)
    return ListenerSubscription(Callback.Arity0<Unit> { closedListeners.remove(listener) })
  }

  override fun dispose() {
    PicoPanelRegistry.removeObserver(observer)
    super.dispose()
  }

  // No statics or constructor: hosts come from HybridPicoWindows.createPanelHost.
  companion object : HybridPicoPanelHostSpec.Companion
}
