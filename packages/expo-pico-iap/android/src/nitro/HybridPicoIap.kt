package com.margelo.nitro.expopico.iap

import com.margelo.nitro.core.Promise
import com.bytedance.pico.matrix.proto.v2.Product
import com.pico.pps.sdk.iap.IapClient
import com.pico.pps.sdk.iap.PicoIapClient

/**
 * `PicoIap` backed by `com.pico.pps:platform-service-iap`.
 *
 * The one shape worth knowing before reading this file: `purchaseProduct`
 * takes a whole `Product` message and an extras map, **not** a SKU string.
 * The TypeScript API is `purchase(sku)`, so `purchase` here has to resolve
 * the SKU to a `Product` first. That is a real network round-trip, not an
 * artifact of the binding — see the "shape mismatches" section of
 * `docs/PPS-WIRING-GAPS.md`.
 */
class HybridPicoIap : HybridPicoIapSpec() {

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

  override fun getProducts(skus: Array<String>): Promise<Array<IapProduct>> {
    val iap = client ?: return Promise.rejected(PicoPps.unavailable("getProducts"))
    // Second argument is the pagination cursor (`bodyParams` on the
    // response). Empty asks for the first page.
    return iap.getProductList(skus.toList(), "").bridge("getProducts") { response ->
      response.productList.orEmpty().map { it.toIapProduct() }.toTypedArray()
    }
  }

  override fun getPurchaseHistory(): Promise<Array<IapPurchase>> {
    val iap = client ?: return Promise.rejected(PicoPps.unavailable("getPurchaseHistory"))
    return iap.getPurchasedProductList("").bridge("getPurchaseHistory") { response ->
      response.purchasedProductList.orEmpty().map { purchased ->
        IapPurchase(
          sku = purchased.sku.orEmpty(),
          orderId = purchased.purchaseId.orEmpty(),
          purchaseToken = purchased.purchaseId.orEmpty(),
          purchasedAtMs = purchased.grantTime.toEpochMillis(),
          // PPS does not report a consumed flag on the purchase record.
          // A consumed product leaves the purchased list entirely, so
          // anything still in this response is un-consumed.
          isConsumed = false,
        )
      }.toTypedArray()
    }
  }

  /**
   * Purchase resolves the SKU to a `Product` first, because that is what
   * `purchaseProduct` accepts.
   *
   * The extras map is where a caller would attach an order comment or a
   * developer payload; nothing in the TypeScript API exposes that yet, so
   * it is sent empty rather than invented.
   */
  override fun purchase(sku: String): Promise<PurchaseResult> {
    val iap = client ?: return Promise.rejected(PicoPps.unavailable("purchase"))
    val promise = Promise<PurchaseResult>()
    iap.getProductList(listOf(sku), "")
      .bridge("purchase/lookup") { response ->
        response.productList.orEmpty().firstOrNull { it.sku == sku }
          ?: throw IllegalArgumentException("UNKNOWN_SKU: no product is published for '$sku'")
      }
      .then { product ->
        iap.purchaseProduct(product, emptyMap())
          .bridge("purchase") { response ->
            val purchased = response.purchasedProduct
              ?: throw IllegalStateException("purchase returned no purchased product")
            PurchaseResult(
              sku = purchased.sku.orEmpty(),
              orderId = purchased.purchaseId.orEmpty(),
              purchaseToken = purchased.purchaseId.orEmpty(),
              purchasedAtMs = purchased.grantTime.toEpochMillis(),
            )
          }
          .then { promise.resolve(it) }
          .catch { promise.reject(it) }
      }
      .catch { promise.reject(it) }
    return promise
  }

  /**
   * `consumeProduct` takes the purchase identifier — the same value this
   * package surfaces as `purchaseToken`. `ConsumeProductResponse` carries
   * no fields, so a successful call is the entire result and the timestamp
   * below is the moment the SDK acknowledged it.
   */
  override fun consumePurchase(purchaseToken: String): Promise<ConsumeResult> {
    val iap = client ?: return Promise.rejected(PicoPps.unavailable("consumePurchase"))
    return iap.consumeProduct(purchaseToken).bridge("consumePurchase") {
      ConsumeResult(
        sku = "",
        purchaseToken = purchaseToken,
        consumedAtMs = System.currentTimeMillis().toDouble(),
      )
    }
  }

  private fun Product.toIapProduct(): IapProduct =
    IapProduct(
      sku = sku.orEmpty(),
      title = name.orEmpty(),
      description = description.orEmpty(),
      formattedPrice = formattedPrice.orEmpty(),
      priceMicros = price.toPriceMicros(),
      currency = currency.orEmpty(),
      // `isContinuous` is the only field on `Product` whose meaning is
      // unambiguous in the artifact: a continuous product renews, so it is
      // not consumable. `addonsType` looks like the field that should
      // answer this, but it is a bare `Integer` with no accompanying enum
      // in the published protobuf, so its value space would be a guess.
      type = if (isContinuous == true) IapProductType.NON_CONSUMABLE else IapProductType.CONSUMABLE,
    )

  private companion object {
    /** Kept in step with `PPS_VERSION` in `plugin/src/ppsArtifacts.ts`. */
    const val PPS_VERSION = "1.0.0"

    /**
     * `Product.price` is a decimal string in major currency units.
     * Micros keep the JS side clear of float drift when comparing prices.
     * An unparseable price yields 0 rather than throwing — a malformed
     * price should not make the whole catalogue fail to load.
     */
    fun String?.toPriceMicros(): Double {
      val parsed = this?.trim()?.toDoubleOrNull() ?: return 0.0
      return parsed * 1_000_000.0
    }

    /** PPS reports times in seconds; the TypeScript API is in milliseconds. */
    fun Long?.toEpochMillis(): Double = if (this == null) 0.0 else this * 1000.0
  }
}
