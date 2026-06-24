package expo.modules.pico.account

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.pico.PicoPlatformSDK

class ExpoPicoAccountModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoPicoAccount")

        Constants(
            "accountSdkAvailable" to AccountUtils.isPlatformSdkAvailable(),
            "accountSdkVersion" to (AccountUtils.getPlatformSdkVersion() ?: "unavailable"),
            "accountSdkStatus" to (
                if (AccountUtils.isPlatformSdkAvailable())
                    (PicoPlatformSDK.getInitFailureReason() ?: "ready")
                else
                    "PICO Platform SDK AAR not found. Download from " +
                    "developer.picoxr.com/resources and drop into " +
                    "android/app/libs/, then rebuild."
            ),
        )

        AsyncFunction("getUserProfile") { promise: Promise ->
            AccountBridge.getUserProfile(
                onSuccess = { map -> promise.resolve(map) },
                onError = { code, msg -> promise.reject(code, msg, null) },
            )
        }

        AsyncFunction("getAccountLinkStatus") { promise: Promise ->
            AccountBridge.getAccountLinkStatus(
                onSuccess = { status -> promise.resolve(status) },
                onError = { code, msg -> promise.reject(code, msg, null) },
            )
        }

        AsyncFunction("getAccessToken") { promise: Promise ->
            AccountBridge.getAccessToken(
                onSuccess = { token -> promise.resolve(token) },
                onError = { code, msg -> promise.reject(code, msg, null) },
            )
        }

        AsyncFunction("login") { promise: Promise ->
            AccountBridge.login(
                onSuccess = { map -> promise.resolve(map) },
                onError = { code, msg -> promise.reject(code, msg, null) },
            )
        }

        AsyncFunction("logout") { promise: Promise ->
            AccountBridge.logout(
                onSuccess = { promise.resolve(null) },
                onError = { code, msg -> promise.reject(code, msg, null) },
            )
        }
    }
}
