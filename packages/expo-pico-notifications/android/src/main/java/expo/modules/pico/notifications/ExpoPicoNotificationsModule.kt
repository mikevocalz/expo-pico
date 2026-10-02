package expo.modules.pico.notifications

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import expo.modules.pico.BuildConfig

class ExpoPicoNotificationsModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoPicoNotifications")

        Constants(
            "notificationsSdkAvailable" to NotificationUtils.isNotificationSdkAvailable(),
            "notificationsSdkVersion"   to (NotificationUtils.getNotificationSdkVersion() ?: "unavailable")
        )

        Function("getPermissionStatus") {
            NotificationUtils.getPermissionStatus(appContext.reactContext)
        }

        AsyncFunction("requestPermissions") { promise: Promise ->
            NotificationsBridge.requestPermissions(
                onSuccess = { result -> promise.resolve(result) },
                onError   = { code, msg -> promise.reject(code, msg, null) }
            )
        }

        // IPPSPushClient.register(appId, fcmToken, callback)
        // Empty fcmToken is accepted by the SDK on PICO devices (the OS push
        // service issues a token without external FCM integration).
        AsyncFunction("registerForPushNotifications") { promise: Promise ->
            NotificationsBridge.registerForPushNotifications(
                appId = BuildConfig.PICO_APP_ID,
                fcmToken = "",
                onSuccess = { map -> promise.resolve(map) },
                onError   = { code, msg -> promise.reject(code, msg, null) },
            )
        }
    }
}
