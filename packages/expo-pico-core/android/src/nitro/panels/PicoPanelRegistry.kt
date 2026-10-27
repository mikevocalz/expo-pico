package expo.modules.pico

import android.os.Looper
import androidx.annotation.MainThread
import com.margelo.nitro.expopico.picocore.PanelCloseReason
import java.lang.ref.WeakReference
import java.util.concurrent.CopyOnWriteArraySet

/**
 * The open panel activities, by the component name each renders, and the
 * observers that hear about them.
 *
 * The panel map belongs to the main thread, where activity callbacks run;
 * its entry points check the thread instead of locking. Observers are added
 * from the JS thread, so they live in a copy-on-write set and every
 * notification walks a snapshot.
 */
internal object PicoPanelRegistry {
  private val panels = mutableMapOf<String, WeakReference<PicoPanelActivity>>()
  private val observers = CopyOnWriteArraySet<PicoPanelObserver>()

  fun addObserver(observer: PicoPanelObserver) {
    observers.add(observer)
  }

  fun removeObserver(observer: PicoPanelObserver) {
    observers.remove(observer)
  }

  @MainThread
  fun find(name: String): PicoPanelActivity? {
    checkMainThread()
    val activity = panels[name]?.get()
    if (activity == null || activity.isFinishing || activity.isDestroyed) return null
    return activity
  }

  @MainThread
  fun opened(name: String, activity: PicoPanelActivity) {
    checkMainThread()
    panels[name] = WeakReference(activity)
    for (observer in observers) observer.onPanelOpened(name)
  }

  @MainThread
  fun closed(name: String, activity: PicoPanelActivity, reason: PanelCloseReason) {
    checkMainThread()
    // A newer instance may already own the name; only this one's entry goes.
    if (panels[name]?.get() === activity) panels.remove(name)
    for (observer in observers) observer.onPanelClosed(name, reason)
  }

  private fun checkMainThread() {
    check(Looper.myLooper() == Looper.getMainLooper()) {
      "PicoPanelRegistry is main-thread only; called from ${Thread.currentThread().name}."
    }
  }
}
