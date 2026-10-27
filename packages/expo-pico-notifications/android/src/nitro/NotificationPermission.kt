package com.margelo.nitro.expopico.notifications

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.facebook.react.modules.core.PermissionAwareActivity
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

/**
 * The app's POST_NOTIFICATIONS state, read and requested through Android.
 *
 * PPS has no permission API of its own: push delivery on PICO OS goes through
 * the normal Android notification permission. Android also has no "never
 * asked" query, so `NOT_DETERMINED` means API 33+, not granted, and this
 * module has not shown the prompt yet (tracked in shared preferences). Below
 * API 33 there is no runtime prompt: notifications are on unless the user
 * turned them off in Settings.
 */
internal object NotificationPermission {
  private const val PREFS = "expo-pico-notifications"
  private const val KEY_REQUESTED = "postNotificationsRequested"
  private const val REQUEST_CODE = 0x5049 // "PI"

  fun status(): NotificationPermissionStatus {
    val context = NitroModules.applicationContext ?: return NotificationPermissionStatus.NOT_DETERMINED
    return status(context)
  }

  private fun status(context: Context): NotificationPermissionStatus {
    val enabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return if (enabled) NotificationPermissionStatus.GRANTED else NotificationPermissionStatus.DENIED
    }
    val granted = ContextCompat.checkSelfPermission(
      context,
      Manifest.permission.POST_NOTIFICATIONS,
    ) == PackageManager.PERMISSION_GRANTED
    return when {
      granted && enabled -> NotificationPermissionStatus.GRANTED
      // Granted, then switched off in Settings.
      granted -> NotificationPermissionStatus.DENIED
      wasRequested(context) -> NotificationPermissionStatus.DENIED
      else -> NotificationPermissionStatus.NOT_DETERMINED
    }
  }

  /**
   * Raises the OS prompt when it exists (API 33+) and the status is
   * `NOT_DETERMINED`; otherwise resolves with the current status and
   * `prompted = false`.
   */
  fun request(): Promise<NotificationPermissionResult> {
    val context = NitroModules.applicationContext
      ?: return Promise.rejected(IllegalStateException("NO_CONTEXT: React context not ready"))
    val before = status(context)
    if (before != NotificationPermissionStatus.NOT_DETERMINED ||
      Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
    ) {
      return Promise.resolved(NotificationPermissionResult(status = before, prompted = false))
    }
    val activity = context.currentActivity
    val permissionAware = activity as? PermissionAwareActivity
    if (activity == null || permissionAware == null) {
      return Promise.rejected(
        IllegalStateException(
          "NO_ACTIVITY: requestPermissions needs a foreground activity to show the prompt"
        )
      )
    }

    val promise = Promise<NotificationPermissionResult>()
    activity.runOnUiThread {
      try {
        permissionAware.requestPermissions(
          arrayOf(Manifest.permission.POST_NOTIFICATIONS),
          REQUEST_CODE,
        ) { requestCode, _, _ ->
          if (requestCode != REQUEST_CODE) return@requestPermissions false
          markRequested(context)
          promise.resolve(NotificationPermissionResult(status = status(context), prompted = true))
          true
        }
      } catch (t: Throwable) {
        promise.reject(t)
      }
    }
    return promise
  }

  private fun markRequested(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit().putBoolean(KEY_REQUESTED, true).apply()
  }

  private fun wasRequested(context: Context): Boolean =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_REQUESTED, false)
}
