package expo.modules.pico.iap

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import expo.modules.pico.PicoPlatformSDK

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
            "iapSdkVersion" to (IapUtils.getIapSdkVersion() ?: "unavailable"),
            // Human-readable remediation step — surfaces in the
            // Diagnostics tab instead of just NOT_IMPLEMENTED.
            "iapSdkStatus" to (
                if (IapUtils.isIapSdkAvailable())
                    (PicoPlatformSDK.getInitFailureReason() ?: "ready")
                else
                    "PICO Platform Service SDK (PPS) not on classpath. " +
                    "Build the picoDebug variant on PICO hardware — " +
                    "withPicoGradle pulls com.pico.pps:platform-service-iap:1.0.0 " +
                    "from the public Bytedance Maven repo automatically. " +
                    "If you're already on picoDebug, confirm Gradle had " +
                    "network access at prebuild time and rebuild."
            ),
        )

        AsyncFunction("getProducts") { skus: List<String>, promise: Promise ->
            IapBridge.getProducts(
                skus,
                onSuccess = { list -> promise.resolve(list) },
                onError = { code, msg -> promise.reject(code, msg, null) },
            )
        }

        AsyncFunction("consumePurchase") { purchaseToken: String, promise: Promise ->
            IapBridge.consumePurchase(
                purchaseToken,
                onSuccess = { result -> promise.resolve(result) },
                onError = { code, msg -> promise.reject(code, msg, null) },
            )
        }

        AsyncFunction("getPurchaseHistory") { promise: Promise ->
            IapBridge.getPurchaseHistory(
                onSuccess = { list -> promise.resolve(list) },
                onError = { code, msg -> promise.reject(code, msg, null) },
            )
        }

        AsyncFunction("purchase") { sku: String, promise: Promise ->
            IapBridge.purchase(
                sku,
                onSuccess = { result -> promise.resolve(result) },
                onError = { code, msg -> promise.reject(code, msg, null) },
            )
        }
    }
}
