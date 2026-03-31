package expo.modules.pico.notifications

import android.content.Context

/**
 * NotificationsBridge isolates all PICO push notification SDK calls.
 *
 * Threading: All functions called from AsyncFunction background threads.
 *
 * See: https://developer.picoxr.com/document/unity/push-notification/
 */
internal object NotificationsBridge {

    fun requestPermissions(
        context: Context?,
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // TODO(pico-sdk):
        //   PushSDK.getInstance().requestPermissions(context) { result ->
        //     if (result.isGranted) onSuccess(mapOf(
        //       "status"   to "granted",
        //       "canAskAgain" to true
        //     ))
        //     else onSuccess(mapOf(
        //       "status"   to "denied",
        //       "canAskAgain" to result.canAskAgain
        //     ))
        //   }
        onError("NOT_IMPLEMENTED", "requestPermissions: Notifications SDK not yet linked.")
    }

    fun registerForPushNotifications(
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // TODO(pico-sdk):
        //   PushSDK.getInstance().getToken { result ->
        //     if (result.isSuccess) onSuccess(mapOf(
        //       "token"    to result.token,
        //       "platform" to "pico"
        //     ))
        //     else onError("UNKNOWN", result.errorMessage ?: "registerForPushNotifications failed")
        //   }
        onError("NOT_IMPLEMENTED", "registerForPushNotifications: Notifications SDK not yet linked.")
    }
}
