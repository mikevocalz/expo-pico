"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSubscriptionAvailable = isSubscriptionAvailable;
exports.getSubscriptionSdkVersion = getSubscriptionSdkVersion;
exports.getSubscriptionProducts = getSubscriptionProducts;
exports.getActiveSubscriptions = getActiveSubscriptions;
exports.getSubscriptionEntitlement = getSubscriptionEntitlement;
exports.subscribe = subscribe;
exports.cancelSubscription = cancelSubscription;
const platform_service_common_1 = require("@expo-pico/platform-service-common");
const PKG = '@expo-pico/subscription';
function native() {
    return (0, platform_service_common_1.resolveHybridObject)('PicoSubscription');
}
function isSubscriptionAvailable() {
    return native()?.available ?? false;
}
function getSubscriptionSdkVersion() {
    return native()?.sdkVersion ?? 'unavailable';
}
async function getSubscriptionProducts(skus) {
    (0, platform_service_common_1.guardService)(isSubscriptionAvailable(), PKG, 'getSubscriptionProducts');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getSubscriptionProducts', native().getSubscriptionProducts(skus));
}
async function getActiveSubscriptions() {
    (0, platform_service_common_1.guardService)(isSubscriptionAvailable(), PKG, 'getActiveSubscriptions');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getActiveSubscriptions', native().getActiveSubscriptions());
}
async function getSubscriptionEntitlement(sku) {
    (0, platform_service_common_1.guardService)(isSubscriptionAvailable(), PKG, 'getSubscriptionEntitlement');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getSubscriptionEntitlement', native().getSubscriptionEntitlement(sku));
}
/** Seam — PICO requires the OS storefront UI. */
async function subscribe(options) {
    (0, platform_service_common_1.guardService)(isSubscriptionAvailable(), PKG, 'subscribe');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'subscribe', native().subscribe(options));
}
/** Rejects with `NOT_IN_PPS_1_0` — cancelling happens in the PICO Store. */
async function cancelSubscription(sku) {
    (0, platform_service_common_1.guardService)(isSubscriptionAvailable(), PKG, 'cancelSubscription');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'cancelSubscription', native().cancelSubscription(sku));
}
//# sourceMappingURL=index.js.map