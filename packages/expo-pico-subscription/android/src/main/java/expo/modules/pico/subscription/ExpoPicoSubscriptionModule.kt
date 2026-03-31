package expo.modules.pico.subscription

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoPicoSubscriptionModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("ExpoPicoSubscription")

    // No events: subscription state is queried, not pushed
    // (subscribe/cancel redirect to OS UI; no callback model documented)

    Constants {
      mapOf(
        "subscriptionSdkAvailable" to SubscriptionUtils.isSubscriptionSdkAvailable(),
        "subscriptionSdkVersion"   to SubscriptionUtils.getSubscriptionSdkVersion()
      )
    }

    AsyncFunction("getSubscriptionProducts") { skus: List<String>, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SubscriptionBridge.getProducts(skus,
        onSuccess = { list -> promise.resolve(list) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("getActiveSubscriptions") { promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SubscriptionBridge.getActiveSubscriptions(
        onSuccess = { list -> promise.resolve(list) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("getSubscriptionEntitlement") { sku: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      SubscriptionBridge.getEntitlement(sku,
        onSuccess = { bundle -> promise.resolve(bundle) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }
  }

  private inline fun guardAvailability(promise: Promise, earlyReturn: () -> Unit) {
    if (!SubscriptionUtils.isSubscriptionSdkAvailable()) {
      promise.reject("SERVICE_UNAVAILABLE", "Subscription SDK not available on this build", null)
      earlyReturn()
    }
  }
}
