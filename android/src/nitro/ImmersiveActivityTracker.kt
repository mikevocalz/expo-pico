package com.margelo.nitro.expopico.picocore

import android.app.Activity
import android.app.Application
import android.os.Bundle
import java.lang.ref.WeakReference

/**
 * Holds the live instance of this app's immersive activity (Viro's
 * `.VRActivity`, found by the plugin's [IMMERSIVE_ACTIVITY_META] marker).
 *
 * The React context's current activity cannot answer this: VRActivity and
 * MainActivity share one ReactHost, and the late `MainActivity.onPause` that
 * follows an XR entry leaves the host pointing at the panel while the immersive
 * activity is in front. Lifecycle callbacks see the real instance.
 *
 * Callbacks run on the main thread; [immersiveActivity] is read from Nitro's
 * threads, hence the volatile reference.
 *
 * Public so the plugin-written `MainApplication.onCreate` can install it before
 * any activity exists; [PicoCorePackage] installs it again as a fallback.
 */
object ImmersiveActivityTracker : Application.ActivityLifecycleCallbacks {
  private var installed = false
  private var immersiveClass: String? = null

  @Volatile
  private var current: WeakReference<Activity>? = null

  /** Registers once per process. A build with no marked activity registers nothing. */
  @JvmStatic
  @Synchronized
  fun install(application: Application) {
    if (installed) return
    installed = true
    immersiveClass = application.immersiveActivityName() ?: return
    application.registerActivityLifecycleCallbacks(this)
  }

  /** The immersive activity when it is alive and not finishing, else null. */
  internal fun immersiveActivity(): Activity? =
    current?.get()?.takeUnless { it.isFinishing || it.isDestroyed }

  override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
    if (activity.componentName.className == immersiveClass) current = WeakReference(activity)
  }

  override fun onActivityDestroyed(activity: Activity) {
    if (current?.get() === activity) current = null
  }

  override fun onActivityStarted(activity: Activity) {}
  override fun onActivityResumed(activity: Activity) {}
  override fun onActivityPaused(activity: Activity) {}
  override fun onActivityStopped(activity: Activity) {}
  override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
}
