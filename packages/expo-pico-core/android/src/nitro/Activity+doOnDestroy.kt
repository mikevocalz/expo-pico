package com.margelo.nitro.expopico.picocore

import android.app.Activity
import android.app.Application
import android.os.Bundle

/**
 * Runs [action] once, on the main thread, when this activity is destroyed.
 * Returns a function that removes the watcher; call it once [action] is no
 * longer needed. Uses the Application's callbacks, so it works below API 29.
 */
internal fun Activity.doOnDestroy(action: () -> Unit): () -> Unit {
  val app = application
  val callbacks = object : Application.ActivityLifecycleCallbacks {
    override fun onActivityDestroyed(activity: Activity) {
      if (activity !== this@doOnDestroy) return
      app.unregisterActivityLifecycleCallbacks(this)
      action()
    }

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit
    override fun onActivityStarted(activity: Activity) = Unit
    override fun onActivityResumed(activity: Activity) = Unit
    override fun onActivityPaused(activity: Activity) = Unit
    override fun onActivityStopped(activity: Activity) = Unit
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
  }
  app.registerActivityLifecycleCallbacks(callbacks)
  return { app.unregisterActivityLifecycleCallbacks(callbacks) }
}
