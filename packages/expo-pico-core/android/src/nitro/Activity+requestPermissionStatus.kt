package com.margelo.nitro.expopico.picocore

import android.app.Activity
import android.content.pm.PackageManager
import com.facebook.react.modules.core.PermissionAwareActivity
import com.margelo.nitro.core.Promise

private const val REQUEST_CODE = 0x5045 // "PE"

/**
 * Asks for [permission] from this activity, so the system grant dialog opens in
 * this activity's task.
 *
 * A manual Promise because the answer arrives through ReactActivity's
 * permission listener. Resolves `granted` without prompting when the app holds
 * the permission. After a denial, `never_ask_again` means Android will not show
 * the dialog again, matching `PermissionsAndroid.RESULTS`. A dialog the system
 * suppresses (Horizon OS does this when the device lacks the feature) returns
 * no grant result and counts as `never_ask_again`.
 *
 * If the activity is destroyed before the user answers, its permission
 * listener never runs. The request then settles as `no_immersive_activity`,
 * so the caller is not left waiting and the next immersive activity can ask
 * again. Everything below runs on the main thread, so one flag is enough to
 * settle the Promise once.
 */
internal fun Activity.requestPermissionStatus(permission: String): Promise<PicoPermissionStatus> {
  if (checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) {
    return Promise.resolved(PicoPermissionStatus.GRANTED)
  }
  val permissionAware = this as? PermissionAwareActivity
    ?: return Promise.resolved(PicoPermissionStatus.NO_IMMERSIVE_ACTIVITY)

  val promise = Promise<PicoPermissionStatus>()
  runOnUiThread {
    if (isDestroyed) {
      promise.resolve(PicoPermissionStatus.NO_IMMERSIVE_ACTIVITY)
      return@runOnUiThread
    }
    var settled = false
    var stopWatching: () -> Unit = {}
    fun settle(outcome: Result<PicoPermissionStatus>) {
      if (settled) return
      settled = true
      stopWatching()
      outcome.fold({ promise.resolve(it) }, { promise.reject(it) })
    }
    stopWatching = doOnDestroy {
      settle(Result.success(PicoPermissionStatus.NO_IMMERSIVE_ACTIVITY))
    }
    try {
      permissionAware.requestPermissions(arrayOf(permission), REQUEST_CODE) { requestCode, _, results ->
        if (requestCode != REQUEST_CODE) return@requestPermissions false
        val status = when {
          results.firstOrNull() == PackageManager.PERMISSION_GRANTED -> PicoPermissionStatus.GRANTED
          results.isNotEmpty() && shouldShowRequestPermissionRationale(permission) ->
            PicoPermissionStatus.DENIED
          else -> PicoPermissionStatus.NEVER_ASK_AGAIN
        }
        settle(Result.success(status))
        true
      }
    } catch (t: Throwable) {
      settle(Result.failure(t))
    }
  }
  return promise
}
