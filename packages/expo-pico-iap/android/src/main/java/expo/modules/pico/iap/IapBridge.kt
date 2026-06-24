package expo.modules.pico.iap

import expo.modules.pico.PicoAppContext
import expo.modules.pico.PicoPlatformSDK

/**
 * IAP bridge — PPS 1.0.x `com.pico.pps.sdk.iap.IapClient`.
 *
 *   PicoIapClient.getIapClient(ctx)
 *       .getProductList(skus, region) → Task<GetProductListResponse>
 *       .purchaseProduct(Product, extras) → Task<PurchaseProductResponse>
 *       .getPurchasedProductList(region) → Task<GetPurchasedProductListResponse>
 *       .consumeProduct(orderId) → Task<ConsumeProductResponse>
 */
internal object IapBridge {
    private val CLIENT = arrayOf(
        "com.pico.pps.sdk.iap.PicoIapClient",
        "com.pico.platform.IapService",
        "com.pvr.iap.sdk.IAPClient",
    )
    private val FACTORY = arrayOf("getIapClient", "getClient", "getInstance")

    fun getProducts(
        skus: List<String>,
        onSuccess: (List<Map<String, Any?>>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val ctx = PicoAppContext.get() ?: return onError("NO_CONTEXT", "PicoAppContext not initialized")
        PicoPlatformSDK.callTask(
            context = ctx,
            clientCandidates = CLIENT,
            factoryNameCandidates = FACTORY,
            methodCandidates = arrayOf("getProductList", "queryProducts"),
            args = arrayOf<Any?>(skus, ""),
            mapResult = { PicoPlatformSDK.coerceToList(it) },
            onSuccess = onSuccess,
            onError = onError,
        )
    }

    fun consumePurchase(
        purchaseToken: String,
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val ctx = PicoAppContext.get() ?: return onError("NO_CONTEXT", "PicoAppContext not initialized")
        PicoPlatformSDK.callTask(
            context = ctx,
            clientCandidates = CLIENT,
            factoryNameCandidates = FACTORY,
            methodCandidates = arrayOf("consumeProduct", "consumePurchase", "consume"),
            args = arrayOf<Any?>(purchaseToken),
            mapResult = { _ -> mapOf<String, Any?>("purchaseToken" to purchaseToken, "success" to true) },
            onSuccess = onSuccess,
            onError = onError,
        )
    }

    fun getPurchaseHistory(
        onSuccess: (List<Map<String, Any?>>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val ctx = PicoAppContext.get() ?: return onError("NO_CONTEXT", "PicoAppContext not initialized")
        PicoPlatformSDK.callTask(
            context = ctx,
            clientCandidates = CLIENT,
            factoryNameCandidates = FACTORY,
            methodCandidates = arrayOf("getPurchasedProductList", "queryPurchasedGoods", "getPurchases"),
            args = arrayOf<Any?>(""),
            mapResult = { PicoPlatformSDK.coerceToList(it) },
            onSuccess = onSuccess,
            onError = onError,
        )
    }

    // purchase = getProductList([sku],"") → find Product with matching sku → purchaseProduct(product, {})
    fun purchase(
        sku: String,
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val ctx = PicoAppContext.get() ?: return onError("NO_CONTEXT", "PicoAppContext not initialized")
        // Step 1: resolve sku → Product proto via getProductList
        PicoPlatformSDK.callTask(
            context = ctx,
            clientCandidates = CLIENT,
            factoryNameCandidates = FACTORY,
            methodCandidates = arrayOf("getProductList"),
            args = arrayOf<Any?>(listOf(sku), ""),
            mapResult = { it },  // pass raw response through
            onSuccess = { raw ->
                val product = findProductBySku(raw, sku)
                if (product == null) {
                    onError("PRODUCT_NOT_FOUND", "No Product matching sku=$sku")
                    return@callTask
                }
                // Step 2: purchaseProduct(product, emptyMap)
                PicoPlatformSDK.callTask(
                    context = ctx,
                    clientCandidates = CLIENT,
                    factoryNameCandidates = FACTORY,
                    methodCandidates = arrayOf("purchaseProduct"),
                    args = arrayOf<Any?>(product, emptyMap<String, String>()),
                    mapResult = { resp ->
                        val asMap = if (resp is Map<*, *>) {
                            @Suppress("UNCHECKED_CAST") resp as Map<String, Any?>
                        } else PicoPlatformSDK.objectToMap(resp) ?: emptyMap()
                        mapOf<String, Any?>(
                            "sku" to sku,
                            "orderId" to (asMap["orderId"] ?: asMap["transactionId"]),
                            "purchaseToken" to (asMap["purchaseToken"] ?: asMap["token"]),
                            "raw" to asMap,
                        )
                    },
                    onSuccess = onSuccess,
                    onError = onError,
                )
            },
            onError = onError,
        )
    }

    // GetProductListResponse.productList : List<Product> — pull the Product whose sku matches.
    private fun findProductBySku(raw: Any?, sku: String): Any? {
        if (raw == null) return null
        // walk the response object reflectively to find a List field, then a Product with matching sku
        for (f in raw.javaClass.fields) {
            val v = try { f.get(raw) } catch (_: Throwable) { continue }
            if (v is List<*>) {
                for (item in v) {
                    if (item == null) continue
                    val itemSku = try { item.javaClass.getField("sku").get(item) as? String } catch (_: Throwable) { null }
                    if (itemSku == sku) return item
                }
            }
        }
        return null
    }
}
