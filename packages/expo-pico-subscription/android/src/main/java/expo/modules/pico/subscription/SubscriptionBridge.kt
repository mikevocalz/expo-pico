package expo.modules.pico.subscription

/**
 * SubscriptionBridge isolates all PICO Platform SDK subscription/billing calls.
 *
 * Note on subscribe() and cancelSubscription():
 * These are NOT in this bridge. Both operations redirect to the PICO OS subscription
 * management screen — there is no headless purchase or cancellation path documented
 * in public PICO SDK docs as of PICO OS 6. They are permanent JS-level seams.
 *
 * Threading:
 * All functions called from AsyncFunction background threads (Expo Modules default).
 * SDK callbacks are passed through onSuccess/onError — thread-safe by design.
 *
 * See: https://developer.picoxr.com/document/unity/subscription/
 */
internal object SubscriptionBridge {

  fun getProducts(
    skus: List<String>,
    onSuccess: (List<Map<String, Any?>>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   SubscriptionService.queryProducts(skus) { result ->
    //     if (result.isSuccess) onSuccess(result.productList.map { p ->
    //       mapOf(
    //         "sku"                       to p.sku,
    //         "title"                     to p.title,
    //         "description"               to p.description,
    //         "formattedPrice"            to p.formattedPrice,
    //         "priceMicros"               to p.priceMicros,
    //         "currency"                  to p.currency,
    //         "period"                    to p.billingPeriod.name.lowercase(),
    //         "trialDays"                 to (p.trialPeriodDays ?: 0),
    //         "introductoryFormattedPrice" to p.introductoryPrice
    //       )
    //     })
    //     else onError("PRODUCT_NOT_FOUND", result.errorMessage ?: "queryProducts failed")
    //   }
    onError("NOT_IMPLEMENTED", "getSubscriptionProducts: Subscription SDK not yet linked.")
  }

  fun getActiveSubscriptions(
    onSuccess: (List<Map<String, Any?>>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   SubscriptionService.queryActiveSubscriptions { result ->
    //     if (result.isSuccess) onSuccess(result.subscriptions.map { s ->
    //       mapOf("sku" to s.sku, "orderId" to s.orderId, "status" to s.status.name.lowercase(), ...)
    //     })
    //     else onError("BILLING_UNAVAILABLE", result.errorMessage ?: "queryActive failed")
    //   }
    onError("NOT_IMPLEMENTED", "getActiveSubscriptions: Subscription SDK not yet linked.")
  }

  fun getEntitlement(
    sku: String,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   SubscriptionService.queryEntitlement(sku) { result ->
    //     if (result.isSuccess) onSuccess(mapOf(
    //       "sku"                 to sku,
    //       "status"              to result.status.name.lowercase(),
    //       "currentSubscription" to result.activeSubscription?.toMap(),
    //       "expiresAtMs"         to result.expiresAt
    //     ))
    //     else onError("BILLING_UNAVAILABLE", result.errorMessage ?: "queryEntitlement failed")
    //   }
    onError("NOT_IMPLEMENTED", "getSubscriptionEntitlement: Subscription SDK not yet linked.")
  }
}
