package expo.modules.pico.iap

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

/**
 * Expo Module for PICO in-app purchase APIs.
 *
 * @see https://developer.picoxr.com/document/unity/in-app-purchase/
 */
class ExpoPicoIapModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoPicoIap")

        Constants(
            "iapSdkAvailable" to IapUtils.isIapSdkAvailable(),
            "iapSdkVersion"   to (IapUtils.getIapSdkVersion() ?: "unavailable")
        )

        AsyncFunction("getProducts") { skus: List<String>, promise: Promise ->
            guardAvailability(promise) { return@AsyncFunction }
            IapBridge.getProducts(skus,
                onSuccess = { list -> promise.resolve(list) },
                onError   = { code, msg -> promise.reject(code, msg, null) }
            )
        }

        AsyncFunction("consumePurchase") { purchaseToken: String, promise: Promise ->
            guardAvailability(promise) { return@AsyncFunction }
            IapBridge.consumePurchase(purchaseToken,
                onSuccess = { result -> promise.resolve(result) },
                onError   = { code, msg -> promise.reject(code, msg, null) }
            )
        }

        AsyncFunction("getPurchaseHistory") { promise: Promise ->
            guardAvailability(promise) { return@AsyncFunction }
            IapBridge.getPurchaseHistory(
                onSuccess = { list -> promise.resolve(list) },
                onError   = { code, msg -> promise.reject(code, msg, null) }
            )
        }
    }

    private inline fun guardAvailability(promise: Promise, earlyReturn: () -> Unit) {
        if (!IapUtils.isIapSdkAvailable()) {
            promise.reject("SERVICE_UNAVAILABLE", "IAP SDK not available on this build", null)
            earlyReturn()
        }
    }
}
