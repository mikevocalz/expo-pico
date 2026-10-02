package expo.modules.pico.notifications

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.pico.BuildConfig

class ExpoPicoNotificationsModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoPicoNotifications")

        Events("onPushMessage", "onPushRevocation")

        Constants(
            "notificationsSdkAvailable" to NotificationUtils.isNotificationSdkAvailable(),
            "notificationsSdkVersion" to (NotificationUtils.getNotificationSdkVersion() ?: "unavailable"),
            "notificationPermissionStatus" to NotificationsBridge.permissionStatus(),
        )

        Function("getPermissionStatus") {
            NotificationsBridge.permissionStatus()
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

        AsyncFunction("requestPermissions") { promise: Promise ->
            NotificationsBridge.requestPermissions(
                onSuccess = { result -> promise.resolve(result) },
                onError = { code, msg -> promise.reject(code, msg, null) },
            )
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
