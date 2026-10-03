package expo.modules.pico.social

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.util.Log
import java.lang.reflect.Proxy
import java.util.concurrent.atomic.AtomicBoolean

/**
 * PPS 1.0 launch-intent plumbing, reached by reflection because the social
 * AAR is `compileOnly`.
 *
 * What PPS offers (javap on platform-service-social-1.0.0):
 *  - `PicoSocialClient.init(Activity)` hands the activity's intent to
 *    `PicoClientLaunchStatusMgr.onCheckIntentChanged` and registers a
 *    system-service callback (`register_launch_intent_change_callback`) that
 *    feeds later intents into the same method. Without this call PPS never
 *    sees an intent, so `getLaunchDetails()` always reports a normal launch.
 *  - `ISocialClient.getLaunchDetails()` parses the latest intent's
 *    `intent_cmd` extra (JSON carrying `pvr_social_launch`).
 *  - `ISocialClient.setLaunchIntentChangeCallback(ILaunchIntentChangeCallback)`
 *    appends to a process-wide list. There is no remove call.
 *  - `PicoClientLaunchStatusMgr.onCheckIntentChanged(Intent)` ignores intents
 *    without PICO keys or already seen, then fires every registered callback.
 *
 * Because PPS cannot unregister a callback, this registers one per process and
 * forwards to [sink], which the module sets in OnCreate and clears in
 * OnDestroy. A module recreated by a JS reload reuses the same registration.
 */
internal object SocialLaunchDetails {
  private const val TAG = "ExpoPicoSocial"
  private const val SOCIAL_CLIENT = "com.pico.pps.sdk.social.PicoSocialClient"
  private const val CALLBACK_INTERFACE = "com.pico.pps.sdk.social.ILaunchIntentChangeCallback"
  private const val STATUS_MGR = "com.pico.pps.sdk.social.PicoClientLaunchStatusMgr"

  private val initialized = AtomicBoolean(false)
  private val callbackRegistered = AtomicBoolean(false)

  @Volatile
  var sink: ((Map<String, Any?>) -> Unit)? = null

  /** Hands PPS the launch activity. Safe to call repeatedly; runs once. */
  fun initIfNeeded(activity: Activity?) {
    if (activity == null || !SocialUtils.isSocialSdkAvailable()) return
    if (!initialized.compareAndSet(false, true)) return
    try {
      Class.forName(SOCIAL_CLIENT)
        .getMethod("init", Activity::class.java)
        .invoke(null, activity)
    } catch (t: Throwable) {
      Log.w(TAG, "PicoSocialClient.init failed: ${t.javaClass.simpleName}: ${t.message}")
    }
  }

  /** Registers the single process-wide PPS callback that feeds [sink]. */
  fun registerCallbackIfNeeded(context: Context?) {
    if (context == null || !SocialUtils.isSocialSdkAvailable()) return
    if (!callbackRegistered.compareAndSet(false, true)) return
    try {
      val callbackClass = Class.forName(CALLBACK_INTERFACE)
      val callback = Proxy.newProxyInstance(
        callbackClass.classLoader,
        arrayOf(callbackClass),
      ) { proxy, method, args ->
        when (method.name) {
          "onChange" -> {
            val details = args?.firstOrNull()
            if (details != null) sink?.invoke(LaunchDetailsMapper.toMap(details))
            return@newProxyInstance null
          }
          "equals" -> return@newProxyInstance proxy === args?.firstOrNull()
          "hashCode" -> return@newProxyInstance System.identityHashCode(proxy)
          "toString" -> return@newProxyInstance "ExpoPicoSocialLaunchIntentCallback"
          else -> return@newProxyInstance null
        }
      }
      val client = socialClient(context)
      client.javaClass
        .getMethod("setLaunchIntentChangeCallback", callbackClass)
        .invoke(client, callback)
    } catch (t: Throwable) {
      callbackRegistered.set(false)
      Log.w(TAG, "setLaunchIntentChangeCallback failed: ${t.javaClass.simpleName}: ${t.message}")
    }
  }

  /** Feeds an intent delivered to the running activity into PPS. */
  fun onNewIntent(intent: Intent) {
    if (!SocialUtils.isSocialSdkAvailable()) return
    try {
      val mgrClass = Class.forName(STATUS_MGR)
      val mgr = mgrClass.getField("INSTANCE").get(null)
      mgrClass.getMethod("onCheckIntentChanged", Intent::class.java).invoke(mgr, intent)
    } catch (t: Throwable) {
      Log.w(TAG, "onCheckIntentChanged failed: ${t.javaClass.simpleName}: ${t.message}")
    }
  }

  /** Current launch details. Never throws; falls back to a normal launch. */
  fun read(context: Context?): Map<String, Any?> {
    if (context == null || !SocialUtils.isSocialSdkAvailable()) return LaunchDetailsMapper.NORMAL_LAUNCH
    try {
      val client = socialClient(context)
      val details = client.javaClass.getMethod("getLaunchDetails").invoke(client)
        ?: return LaunchDetailsMapper.NORMAL_LAUNCH
      return LaunchDetailsMapper.toMap(details)
    } catch (t: Throwable) {
      Log.w(TAG, "getLaunchDetails failed: ${t.javaClass.simpleName}: ${t.message}")
      return LaunchDetailsMapper.NORMAL_LAUNCH
    }
  }

  private fun socialClient(context: Context): Any {
    return requireNotNull(
      Class.forName(SOCIAL_CLIENT)
        .getMethod("getSocialClient", Context::class.java)
        .invoke(null, context)
    ) { "PicoSocialClient.getSocialClient returned null" }
  }
}
