package expo.modules.pico.iap

/**
 * IapBridge isolates all PICO IAP SDK calls.
 *
 * Threading: All functions called from AsyncFunction background threads.
 *
 * See: https://developer.picoxr.com/document/unity/in-app-purchase/
 */
internal object IapBridge {

    fun getProducts(
        skus: List<String>,
        onSuccess: (List<Map<String, Any?>>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // TODO(pico-sdk):
        //   IAPClient.getInstance().getProductsByID(skus) { result ->
        //     if (result.isSuccess) onSuccess(result.products.map { p ->
        //       mapOf(
        //         "sku"           to p.sku,
        //         "title"         to p.title,
        //         "description"   to p.description,
        //         "price"         to p.price,
        //         "currency"      to p.currency,
        //         "type"          to p.type.name.lowercase()
        //       )
        //     })
        //     else onError("PRODUCT_NOT_FOUND", result.errorMessage ?: "getProducts failed")
        //   }
        onError("NOT_IMPLEMENTED", "getProducts: IAP SDK not yet linked.")
    }

    fun consumePurchase(
        purchaseToken: String,
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // TODO(pico-sdk):
        //   IAPClient.getInstance().consumePurchase(purchaseToken) { result ->
        //     if (result.isSuccess) onSuccess(mapOf(
        //       "purchaseToken" to purchaseToken,
        //       "success"       to true
        //     ))
        //     else onError("UNKNOWN", result.errorMessage ?: "consumePurchase failed")
        //   }
        onError("NOT_IMPLEMENTED", "consumePurchase: IAP SDK not yet linked.")
    }

    fun getPurchaseHistory(
        onSuccess: (List<Map<String, Any?>>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // TODO(pico-sdk):
        //   IAPClient.getInstance().queryPurchasedGoods { result ->
        //     if (result.isSuccess) onSuccess(result.purchases.map { p ->
        //       mapOf(
        //         "sku"            to p.sku,
        //         "purchaseToken"  to p.purchaseToken,
        //         "purchasedAt"    to p.purchasedAt,
        //         "type"           to p.type.name.lowercase()
        //       )
        //     })
        //     else onError("UNKNOWN", result.errorMessage ?: "getPurchaseHistory failed")
        //   }
        onError("NOT_IMPLEMENTED", "getPurchaseHistory: IAP SDK not yet linked.")
    }
}
