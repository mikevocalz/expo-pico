package com.margelo.nitro.expopico.social

import android.app.Activity
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.pico.pps.sdk.social.ILaunchIntentChangeCallback
import com.pico.pps.sdk.social.LaunchDetails as PpsLaunchDetails
import com.pico.pps.sdk.social.PicoSocialClient
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicBoolean

/**
 * PPS 1.0 launch-intent plumbing, owned by the process rather than by one
 * `HybridPicoSocial`.
 *
 * What PPS offers (javap on platform-service-social-1.0.0):
 *  - `PicoSocialClient.init(Activity)` hands the activity's intent to
 *    `PicoClientLaunchStatusMgr.onCheckIntentChanged` and registers a
 *    system-service callback that feeds later intents into the same method.
 *    Without this call PPS never sees an intent, so `getLaunchDetails()`
 *    always reports a normal launch.
 *  - `ISocialClient.setLaunchIntentChangeCallback` appends to a process-wide
 *    list. There is no remove call.
 *  - `PicoClientLaunchStatusMgr.onCheckIntentChanged(Intent)` ignores intents
 *    without PICO keys or already seen, then fires every registered callback.
 *
 * Because PPS cannot unregister a callback, this registers one per process
 * and forwards to [sink]. The newest `HybridPicoSocial` claims the sink, so a
 * JS reload reuses the registration instead of stacking a second one that
 * would call into a dead runtime.
 *
 * Every entry point returns early unless `PicoPps.sdkPresent`: the PPS
 * classes are `compileOnly` and missing on the mobile flavor.
 */
internal object SocialLaunchDetails {
  private const val TAG = "ExpoPicoSocial"

  // Kotlin `internal object` in platform-service-social, so Kotlin code
  // outside that module cannot name it. Reached through its JVM INSTANCE
  // field instead; the class and method are public in the bytecode.
  private const val STATUS_MGR = "com.pico.pps.sdk.social.PicoClientLaunchStatusMgr"

  private val initialized = AtomicBoolean(false)
  private val callbackRegistered = AtomicBoolean(false)

  @Volatile
  private var attachedTo: WeakReference<ReactApplicationContext>? = null

  @Volatile
  var sink: ((PicoLaunchDetails) -> Unit)? = null

  private val activityListener = object : ActivityEventListener {
    override fun onActivityResult(
      activity: Activity,
      requestCode: Int,
      resultCode: Int,
      data: Intent?,
    ) = Unit

    // An invite accepted while the app runs arrives as a new intent. PPS
    // decides whether it carries PICO launch keys and fires the callback if so.
    override fun onNewIntent(intent: Intent) {
      val context = attachedTo?.get()
      initIfNeeded(context?.currentActivity)
      forwardIntent(intent)
    }
  }

  // The activity may not exist yet when the first HybridPicoSocial is built,
  // so init is retried each time the host resumes. It runs once.
  private val lifecycleListener = object : LifecycleEventListener {
    override fun onHostResume() {
      initIfNeeded(attachedTo?.get()?.currentActivity)
    }

    override fun onHostPause() = Unit

    override fun onHostDestroy() = Unit
  }

  /**
   * Hooks the React context's activity events and the PPS callback, then
   * hands PPS the current activity. Safe to call repeatedly. The callback is
   * registered before init because init replays the launch intent through
   * the same callback list.
   */
  fun attach() {
    if (!PicoPps.sdkPresent) return
    val context = PicoPps.context() as? ReactApplicationContext ?: return
    registerCallbackIfNeeded(context)
    if (attachedTo?.get() !== context) {
      attachedTo = WeakReference(context)
      context.addActivityEventListener(activityListener)
      context.addLifecycleEventListener(lifecycleListener)
    }
    initIfNeeded(context.currentActivity)
  }

  /** Current launch details. Never throws; falls back to a normal launch. */
  fun read(): PicoLaunchDetails {
    if (!PicoPps.sdkPresent) return LaunchDetailsMapper.normalLaunch()
    attach()
    val context = PicoPps.context() ?: return LaunchDetailsMapper.normalLaunch()
    try {
      val details = PicoSocialClient.getSocialClient(context).getLaunchDetails()
        ?: return LaunchDetailsMapper.normalLaunch()
      return LaunchDetailsMapper.toPicoLaunchDetails(details)
    } catch (t: Throwable) {
      Log.w(TAG, "getLaunchDetails failed: ${t.javaClass.simpleName}: ${t.message}")
      return LaunchDetailsMapper.normalLaunch()
    }
  }

  private fun initIfNeeded(activity: Activity?) {
    if (activity == null || !PicoPps.sdkPresent) return
    if (!initialized.compareAndSet(false, true)) return
    try {
      PicoSocialClient.init(activity)
    } catch (t: Throwable) {
      initialized.set(false)
      Log.w(TAG, "PicoSocialClient.init failed: ${t.javaClass.simpleName}: ${t.message}")
    }
  }

  private fun registerCallbackIfNeeded(context: ReactApplicationContext) {
    if (!callbackRegistered.compareAndSet(false, true)) return
    try {
      PicoSocialClient.getSocialClient(context).setLaunchIntentChangeCallback(
        object : ILaunchIntentChangeCallback {
          // PPS declares this parameter nullable. A null carries no intent to
          // report, so it is dropped rather than surfaced as an empty "normal
          // launch", which would look like a real event.
          override fun onChange(launchDetails: PpsLaunchDetails?) {
            val details = launchDetails ?: return
            sink?.invoke(LaunchDetailsMapper.toPicoLaunchDetails(details))
          }
        }
      )
    } catch (t: Throwable) {
      callbackRegistered.set(false)
      Log.w(TAG, "setLaunchIntentChangeCallback failed: ${t.javaClass.simpleName}: ${t.message}")
    }
  }

  private fun forwardIntent(intent: Intent) {
    if (!PicoPps.sdkPresent) return
    try {
      val mgrClass = Class.forName(STATUS_MGR)
      val mgr = mgrClass.getField("INSTANCE").get(null)
      mgrClass.getMethod("onCheckIntentChanged", Intent::class.java).invoke(mgr, intent)
    } catch (t: Throwable) {
      Log.w(TAG, "onCheckIntentChanged failed: ${t.javaClass.simpleName}: ${t.message}")
    }
  }
}
