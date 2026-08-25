package com.margelo.nitro.expopico.subscription

import com.margelo.nitro.core.Promise
import com.bytedance.pico.matrix.proto.v2.Product
import com.bytedance.pico.matrix.proto.v2.QueryProductSubscriptionStatusResponse
import com.bytedance.pico.matrix.proto.v2.SubscriptionStatus
import com.pico.pps.sdk.iap.IapClient
import com.pico.pps.sdk.iap.PicoIapClient

/**
 * `PicoSubscription` backed by `com.pico.pps:platform-service-iap`.
 *
 * Subscriptions have no client of their own — they live on `IapClient`
 * alongside one-off purchases, which the wiring audit confirmed. What that
 * audit also found is that `queryProductSubscriptionStatus(sku)` is real:
 * this package used to treat subscription status as unavailable and route
 * everything through IAP. It returns period bounds, an auto-renew signal
 * via `nextPeriod`, and a cancel reason.
 */
class HybridPicoSubscription : HybridPicoSubscriptionSpec() {

  private val client: IapClient?
    get() {
      if (!PicoPps.sdkPresent) return null
      val context = PicoPps.context() ?: return null
      return try {
        PicoIapClient.getIapClient(context)
      } catch (_: Throwable) {
        null
      }
    }

  override val available: Boolean
    get() = client != null

  override val sdkVersion: String
    get() = if (PicoPps.sdkPresent) PPS_VERSION else ""

  override fun getSubscriptionProducts(skus: Array<String>): Promise<Array<SubscriptionProduct>> {
    val iap = client
      ?: return Promise.rejected(PicoPps.unavailable("getSubscriptionProducts"))
    return iap.getProductList(skus.toList(), "").bridge("getSubscriptionProducts") { response ->
      response.productList.orEmpty()
        // `isContinuous` is what marks a product as renewing. A caller who
        // passes a one-off SKU gets it filtered out rather than described
        // as a subscription with an invented period.
        .filter { it.isContinuous == true }
        .map { it.toSubscriptionProduct() }
        .toTypedArray()
    }
  }

  /**
   * PPS has no "list my subscriptions" call, so this reads the purchased
   * product list and queries the status of each renewing entry.
   *
   * The status query is what distinguishes an active subscription from a
   * lapsed one, and it is per-SKU, so this is N+1 by construction rather
   * than by oversight.
   */
  override fun getActiveSubscriptions(): Promise<Array<ActiveSubscription>> {
    val iap = client
      ?: return Promise.rejected(PicoPps.unavailable("getActiveSubscriptions"))
    val promise = Promise<Array<ActiveSubscription>>()
    iap.getPurchasedProductList("")
      .bridge("getActiveSubscriptions/purchases") { response ->
        response.purchasedProductList.orEmpty().mapNotNull { it.sku }.distinct()
      }
      .then { skus ->
        if (skus.isEmpty()) {
          promise.resolve(emptyArray())
          return@then
        }
        val collected = ArrayList<ActiveSubscription>(skus.size)
        var outstanding = skus.size
        var failed = false
        for (sku in skus) {
          iap.queryProductSubscriptionStatus(sku)
            .bridge("getActiveSubscriptions/$sku") { it }
            .then { status ->
              synchronized(collected) {
                status.toActiveSubscription()?.let { collected.add(it) }
                outstanding -= 1
                if (outstanding == 0 && !failed) {
                  promise.resolve(collected.toTypedArray())
                }
              }
            }
            .catch { error ->
              synchronized(collected) {
                if (!failed) {
                  failed = true
                  promise.reject(error)
                }
              }
            }
        }
      }
      .catch { promise.reject(it) }
    return promise
  }

  override fun getSubscriptionEntitlement(sku: String): Promise<SubscriptionEntitlement> {
    val iap = client
      ?: return Promise.rejected(PicoPps.unavailable("getSubscriptionEntitlement"))
    return iap.queryProductSubscriptionStatus(sku).bridge("getSubscriptionEntitlement") { status ->
      SubscriptionEntitlement(
        sku = sku,
        status = status.status.toEntitlementStatus(),
        currentSubscription = status.toActiveSubscription(),
        expiresAtMs = status.endTime?.takeIf { it > 0L }?.let { it * 1000.0 },
      )
    }
  }

  /**
   * Subscribing goes through the same `purchaseProduct` flow as a one-off,
   * so the SKU has to be resolved to a `Product` first.
   *
   * `promoCode` is passed in the extras map. PPS documents extras as an
   * open string map and this is the only key this package sends; an
   * unrecognised key is ignored by the SDK rather than rejected, so a
   * build against an older PPS still completes the purchase at full price
   * instead of failing.
   */
  override fun subscribe(options: SubscribeOptions): Promise<Unit> {
    val iap = client ?: return Promise.rejected(PicoPps.unavailable("subscribe"))
    val promise = Promise<Unit>()
    iap.getProductList(listOf(options.sku), "")
      .bridge("subscribe/lookup") { response ->
        response.productList.orEmpty().firstOrNull { it.sku == options.sku }
          ?: throw IllegalArgumentException(
            "UNKNOWN_SKU: no subscription is published for '${options.sku}'"
          )
      }
      .then { product ->
        val extras = options.promoCode?.let { mapOf("promoCode" to it) } ?: emptyMap()
        iap.purchaseProduct(product, extras)
          .bridge("subscribe") { }
          .then { promise.resolve(Unit) }
          .catch { promise.reject(it) }
      }
      .catch { promise.reject(it) }
    return promise
  }

  /**
   * Cancellation is not in PPS.
   *
   * `IapClient` has six methods and none of them cancels a subscription —
   * PICO routes cancellation through the Store app, deliberately, the same
   * way Play and the App Store do. An implementation here would have to
   * either lie or launch an activity this API does not describe, so it
   * fails with a message that says where the user actually has to go.
   */
  override fun cancelSubscription(sku: String): Promise<Unit> =
    Promise.rejected(
      UnsupportedOperationException(
        "NOT_IN_PPS_1_0: cancelSubscription has no PICO Platform Service backing. " +
          "Subscriptions are cancelled by the user in the PICO Store, not by the app."
      )
    )

  private fun QueryProductSubscriptionStatusResponse.toActiveSubscription(): ActiveSubscription? {
    val status = status.toEntitlementStatus()
    if (status == EntitlementStatus.NOT_SUBSCRIBED) return null
    return ActiveSubscription(
      sku = sku.orEmpty(),
      // PPS reports no order id or purchase token on the status response;
      // `outerID` is the developer-supplied identifier for the plan and is
      // the only stable handle it does return.
      orderId = outerID.orEmpty(),
      purchaseToken = outerID.orEmpty(),
      currentPeriodStartMs = startTime.toEpochMillis(),
      currentPeriodEndMs = endTime.toEpochMillis(),
      // `nextPeriod` is the period index that will be billed next. Zero
      // means nothing is scheduled, which is what auto-renew being off
      // looks like on the wire.
      autoRenewing = (nextPeriod ?: 0) > 0,
      status = status,
    )
  }

  private fun Product.toSubscriptionProduct(): SubscriptionProduct =
    SubscriptionProduct(
      sku = sku.orEmpty(),
      title = name.orEmpty(),
      description = description.orEmpty(),
      formattedPrice = formattedPrice.orEmpty(),
      priceMicros = price.toPriceMicros(),
      currency = currency.orEmpty(),
      period = periodType.toSubscriptionPeriod(),
      trialDays = trialDays(),
      // `originalPrice` is the pre-discount display price, which is what
      // an introductory offer replaces. Only meaningful when it differs
      // from what the user is actually charged.
      introductoryFormattedPrice = originalPrice?.takeIf { it != formattedPrice },
    )

  /**
   * Trial length normalised to days.
   *
   * `trialPeriodUnit` uses the same numbering as `PeriodType`, so a value
   * of "2 weeks" becomes 14. Units longer than a month are approximated
   * with calendar averages — a trial is a display value, and PPS does not
   * expose the exact end timestamp before purchase.
   */
  private fun Product.trialDays(): Double {
    val value = trialPeriodValue?.toDouble() ?: return 0.0
    if (value <= 0.0) return 0.0
    return when (trialPeriodUnit ?: 0) {
      PPS_PERIOD_HOUR -> value / 24.0
      PPS_PERIOD_DAY -> value
      PPS_PERIOD_WEEK -> value * 7.0
      PPS_PERIOD_MONTH -> value * 30.0
      PPS_PERIOD_QUARTER -> value * 91.0
      PPS_PERIOD_YEAR -> value * 365.0
      else -> 0.0
    }
  }

  private companion object {
    /** Kept in step with `PPS_VERSION` in `plugin/src/ppsArtifacts.ts`. */
    const val PPS_VERSION = "1.0.0"

    // PeriodType as PPS numbers it: INVALID, NONE, HOUR, DAY, WEEK, MONTH,
    // QUARTER, YEAR. Read off the published enum, not assumed.
    const val PPS_PERIOD_HOUR = 2
    const val PPS_PERIOD_DAY = 3
    const val PPS_PERIOD_WEEK = 4
    const val PPS_PERIOD_MONTH = 5
    const val PPS_PERIOD_QUARTER = 6
    const val PPS_PERIOD_YEAR = 7

    /**
     * PPS carries six subscription states plus a default; this API has
     * five plus "not subscribed". `DEFAULT` and `INVALID` both mean the
     * SKU is not subscribed — one because nothing was ever bought, the
     * other because the record is not valid — and neither should read as
     * an active entitlement.
     */
    fun SubscriptionStatus?.toEntitlementStatus(): EntitlementStatus = when (this) {
      SubscriptionStatus.SUBSCRIPTION_STATUS_VALID -> EntitlementStatus.ACTIVE
      SubscriptionStatus.SUBSCRIPTION_STATUS_GracePeriod -> EntitlementStatus.IN_GRACE
      SubscriptionStatus.SUBSCRIPTION_STATUS_PAUSE -> EntitlementStatus.PAUSED
      SubscriptionStatus.SUBSCRIPTION_STATUS_CANCEL -> EntitlementStatus.CANCELLED
      SubscriptionStatus.SUBSCRIPTION_STATUS_EXPIRED -> EntitlementStatus.EXPIRED
      else -> EntitlementStatus.NOT_SUBSCRIBED
    }

    fun Int?.toSubscriptionPeriod(): SubscriptionPeriod = when (this) {
      PPS_PERIOD_WEEK -> SubscriptionPeriod.WEEKLY
      PPS_PERIOD_QUARTER -> SubscriptionPeriod.QUARTERLY
      PPS_PERIOD_YEAR -> SubscriptionPeriod.ANNUAL
      else -> SubscriptionPeriod.MONTHLY
    }

    /** `Product.price` is a decimal string in major currency units. */
    fun String?.toPriceMicros(): Double {
      val parsed = this?.trim()?.toDoubleOrNull() ?: return 0.0
      return parsed * 1_000_000.0
    }

    /** PPS reports times in seconds; the TypeScript API is in milliseconds. */
    fun Long?.toEpochMillis(): Double = if (this == null) 0.0 else this * 1000.0
  }
}
