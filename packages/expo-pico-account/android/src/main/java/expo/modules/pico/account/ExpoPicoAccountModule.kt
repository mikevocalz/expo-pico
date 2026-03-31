package expo.modules.pico.account

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoPicoAccountModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoPicoAccount")

        Constants(
            "accountSdkAvailable" to AccountUtils.isPlatformSdkAvailable(),
            "accountSdkVersion"   to (AccountUtils.getPlatformSdkVersion() ?: "unavailable")
        )

        AsyncFunction("getUserProfile") { promise: Promise ->
            guardAvailability(promise) { return@AsyncFunction }
            AccountBridge.getUserProfile(
                onSuccess = { map -> promise.resolve(map) },
                onError   = { code, msg -> promise.reject(code, msg, null) }
            )
        }

        AsyncFunction("getAccountLinkStatus") { promise: Promise ->
            guardAvailability(promise) { return@AsyncFunction }
            AccountBridge.getAccountLinkStatus(
                onSuccess = { status -> promise.resolve(status) },
                onError   = { code, msg -> promise.reject(code, msg, null) }
            )
        }
    }

    private inline fun guardAvailability(promise: Promise, earlyReturn: () -> Unit) {
        if (!AccountUtils.isPlatformSdkAvailable()) {
            promise.reject("SERVICE_UNAVAILABLE", "Account SDK not available on this build", null)
            earlyReturn()
        }
    }
}
