package expo.modules.pico.notifications

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

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
                context = appContext.reactContext,
                onSuccess = { result -> promise.resolve(result) },
                onError   = { code, msg -> promise.reject(code, msg, null) }
            )
        }
    }
}
