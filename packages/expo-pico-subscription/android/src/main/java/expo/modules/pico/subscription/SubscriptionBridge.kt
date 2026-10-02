package expo.modules.pico.subscription

import expo.modules.pico.PicoAppContext
import expo.modules.pico.PicoPlatformSDK

/**
 * PPS 1.0.x doesn't expose a separate subscription client — subscription
 * products are handled through `IapClient` with a `periodType` field on the
 * Product. So this bridge talks to `PicoIapClient.getIapClient(ctx)`.
 *
 *   getProducts(skus)        → IapClient.getProductList(skus, "")  (filter periodType > 0)
 *   getActiveSubscriptions() → IapClient.getPurchasedProductList("") (filter periodType > 0)
 *   getEntitlement(sku)      → IapClient.queryProductSubscriptionStatus(sku)
 *   subscribe(sku)           → IapClient.getProductList → purchaseProduct
 *   cancelSubscription       → not in SDK; throw clear error
 */
internal object SubscriptionBridge {
    private val CLIENT = arrayOf(
        "com.pico.pps.sdk.iap.PicoIapClient",
        "com.pico.platform.SubscriptionService",
        "com.pvr.platform.sdk.subscription.SubscriptionService",
    )
    private val FACTORY = arrayOf("getIapClient", "getSubscriptionClient", "getClient", "getInstance")

    private inline fun ctx(onError: (String, String) -> Unit, block: (android.content.Context) -> Unit) {
        PicoAppContext.get()?.let(block) ?: onError("NO_CONTEXT", "PicoAppContext not initialized")
    }

    fun getProducts(
        skus: List<String>, onSuccess: (List<Map<String, Any?>>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf("getProductList", "getProducts"),
            arrayOf<Any?>(skus, ""),
            { raw -> PicoPlatformSDK.coerceToList(raw).filter { (it["periodType"] as? Number)?.toInt() != 0 } },
            onSuccess, onError)
    }

    fun getActiveSubscriptions(
        onSuccess: (List<Map<String, Any?>>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf("getPurchasedProductList", "getActiveSubscriptions"),
            arrayOf<Any?>(""),
            { raw -> PicoPlatformSDK.coerceToList(raw).filter { (it["periodType"] as? Number)?.toInt() != 0 } },
            onSuccess, onError)
    }

    fun getEntitlement(
        sku: String, onSuccess: (Map<String, Any?>?) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf("queryProductSubscriptionStatus", "getEntitlement"),
            arrayOf<Any?>(sku),
            { raw -> PicoPlatformSDK.objectToMap(raw) },
            onSuccess, onError)
    }

    // subscribe = same flow as IapBridge.purchase: getProductList([sku],"") → purchaseProduct(p, {})
    fun subscribe(
        sku: String, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = ctx(onError) { c ->
        PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
            arrayOf("getProductList"),
            arrayOf<Any?>(listOf(sku), ""),
            { it },
            { raw ->
                val product = findProductBySku(raw, sku)
                if (product == null) {
                    onError("PRODUCT_NOT_FOUND", "No subscription Product matching sku=$sku")
                    return@callTask
                }
                PicoPlatformSDK.callTask(c, CLIENT, FACTORY,
                    arrayOf("purchaseProduct"),
                    arrayOf<Any?>(product, emptyMap<String, String>()),
                    { resp ->
                        val asMap = if (resp is Map<*, *>) {
                            @Suppress("UNCHECKED_CAST") resp as Map<String, Any?>
                        } else PicoPlatformSDK.objectToMap(resp) ?: emptyMap()
                        mapOf<String, Any?>("sku" to sku, "raw" to asMap)
                    },
                    onSuccess, onError)
            },
            onError)
    }

    private fun findProductBySku(raw: Any?, sku: String): Any? {
        if (raw == null) return null
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
