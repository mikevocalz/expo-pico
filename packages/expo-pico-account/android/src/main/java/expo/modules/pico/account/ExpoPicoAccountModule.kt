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
                    "PICO Platform Service SDK (PPS) not on classpath. " +
                    "Build the picoDebug variant on PICO hardware — " +
                    "withPicoGradle pulls com.pico.pps:platform-service-auth:1.0.0 " +
                    "from the public Bytedance Maven repo automatically. " +
                    "If you're already on picoDebug, confirm Gradle had " +
                    "network access at prebuild time and rebuild."
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
