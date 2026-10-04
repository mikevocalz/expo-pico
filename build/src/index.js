"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIapAvailable = isIapAvailable;
exports.getIapSdkVersion = getIapSdkVersion;
exports.getProducts = getProducts;
exports.consumePurchase = consumePurchase;
exports.getPurchaseHistory = getPurchaseHistory;
exports.isProductPurchased = isProductPurchased;
exports.purchase = purchase;
const platform_service_common_1 = require("@expo-pico/platform-service-common");
const PKG = '@expo-pico/iap';
function native() {
    return (0, platform_service_common_1.resolveHybridObject)('PicoIap');
}
function isIapAvailable() {
    return native()?.available ?? false;
}
function getIapSdkVersion() {
    return native()?.sdkVersion ?? 'unavailable';
}
async function getProducts(skus) {
    (0, platform_service_common_1.guardService)(isIapAvailable(), PKG, 'getProducts');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getProducts', native().getProducts(skus));
}
async function consumePurchase(purchaseToken) {
    (0, platform_service_common_1.guardService)(isIapAvailable(), PKG, 'consumePurchase');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'consumePurchase', native().consumePurchase(purchaseToken));
}
async function getPurchaseHistory() {
    (0, platform_service_common_1.guardService)(isIapAvailable(), PKG, 'getPurchaseHistory');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getPurchaseHistory', native().getPurchaseHistory());
}
async function isProductPurchased(sku) {
    (0, platform_service_common_1.guardService)(isIapAvailable(), PKG, 'isProductPurchased');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'isProductPurchased', native().isProductPurchased(sku));
}
/** Seam — PICO requires the OS storefront UI; no headless purchase path exists. */
async function purchase(sku) {
    (0, platform_service_common_1.guardService)(isIapAvailable(), PKG, 'purchase');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'purchase', native().purchase(sku));
}
//# sourceMappingURL=index.js.map