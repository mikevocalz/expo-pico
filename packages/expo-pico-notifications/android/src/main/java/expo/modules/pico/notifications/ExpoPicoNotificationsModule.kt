package expo.modules.pico.notifications

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.Manifest
import android.os.Build
import expo.modules.pico.BuildConfig

class ExpoPicoNotificationsModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoPicoNotifications")

        Events("onPushMessage", "onPushRevocation")

        Constants(
            "notificationsSdkAvailable" to NotificationUtils.isNotificationSdkAvailable(),
            "notificationsSdkVersion" to (NotificationUtils.getNotificationSdkVersion() ?: "unavailable"),
        )

        Function("getPermissionStatus") {
            NotificationUtils.getPermissionStatus(appContext.reactContext)
        }

        OnStartObserving {
            NotificationsBridge.startObserving(
                message = { payload -> sendEvent("onPushMessage", payload) },
                revocation = { payload -> sendEvent("onPushRevocation", payload) },
            )
        }

        OnStopObserving {
            NotificationsBridge.stopObserving()
        }

        // The OS prompt only exists on API 33+, and only while the status is
        // "not-determined". Otherwise resolve with the current status.
        AsyncFunction("requestPermissions") { promise: Promise ->
            val context = appContext.reactContext
                ?: return@AsyncFunction promise.reject("NO_CONTEXT", "React context not ready", null)
            val before = NotificationUtils.getPermissionStatus(context)
            val permissions = appContext.permissions
            if (before != "not-determined" || Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || permissions == null) {
                promise.resolve(mapOf("status" to before, "prompted" to false))
                return@AsyncFunction
            }
            permissions.askForPermissions({ _ ->
                NotificationUtils.markRequested(context)
                promise.resolve(mapOf(
                    "status" to NotificationUtils.getPermissionStatus(context),
                    "prompted" to true,
                ))
            }, Manifest.permission.POST_NOTIFICATIONS)
        }

        AsyncFunction("registerForPushNotifications") { promise: Promise ->
            NotificationsBridge.registerForPushNotifications(
                appId = BuildConfig.PICO_APP_ID,
                fcmToken = "",
                onSuccess = { result -> promise.resolve(result) },
                onError = { code, msg -> promise.reject(code, msg, null) },
            )
        }

        AsyncFunction("unregisterForPushNotifications") { promise: Promise ->
            NotificationsBridge.unregisterForPushNotifications(
                onSuccess = { promise.resolve(null) },
                onError = { code, msg -> promise.reject(code, msg, null) },
            )
        }
    }
}
