"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAccountAvailable = isAccountAvailable;
exports.getAccountSdkVersion = getAccountSdkVersion;
exports.getAccountSdkStatus = getAccountSdkStatus;
exports.getUserProfile = getUserProfile;
exports.getAccountLinkStatus = getAccountLinkStatus;
exports.login = login;
exports.getAccessToken = getAccessToken;
exports.getAdultStatus = getAdultStatus;
exports.getAuthorizedScopes = getAuthorizedScopes;
exports.requestAuthScopes = requestAuthScopes;
exports.cancelAuthorization = cancelAuthorization;
exports.sendAuthScopesRequest = sendAuthScopesRequest;
exports.logout = logout;
const platform_service_common_1 = require("@expo-pico/platform-service-common");
const PKG = '@expo-pico/account';
/**
 * Created lazily: createHybridObject throws when the native library is absent
 * (mobile flavor, non-PICO hardware), and that must surface as
 * SERVICE_UNAVAILABLE rather than a module-load crash.
 */
function nativeAccount() {
    return (0, platform_service_common_1.resolveHybridObject)('PicoAccount');
}
function isAccountAvailable() {
    return nativeAccount()?.available ?? false;
}
function getAccountSdkVersion() {
    return nativeAccount()?.sdkVersion ?? 'unavailable';
}
/** Remediation step from the native side; 'ready' once the SDK is initialized. */
function getAccountSdkStatus() {
    return nativeAccount()?.sdkStatus ?? 'unknown';
}
function requireAvailable(method) {
    const native = nativeAccount();
    if (native?.available)
        return native;
    throw new platform_service_common_1.PicoServiceError({
        code: platform_service_common_1.PicoErrorCode.SERVICE_UNAVAILABLE,
        packageName: PKG,
        methodName: method,
        message: `${PKG}: ${method}() — ${getAccountSdkStatus()}`,
    });
}
async function getUserProfile() {
    const native = requireAvailable('getUserProfile');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getUserProfile', native.getUserProfile());
}
async function getAccountLinkStatus() {
    const native = requireAvailable('getAccountLinkStatus');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getAccountLinkStatus', native.getAccountLinkStatus());
}
async function login() {
    const native = requireAvailable('login');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'login', native.login());
}
async function getAccessToken() {
    const native = requireAvailable('getAccessToken');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getAccessToken', native.getAccessToken());
}
async function getAdultStatus() {
    const native = requireAvailable('getAdultStatus');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getAdultStatus', native.getAdultStatus());
}
async function getAuthorizedScopes() {
    const native = requireAvailable('getAuthorizedScopes');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getAuthorizedScopes', native.getAuthorizedScopes());
}
async function requestAuthScopes(scopes) {
    const native = requireAvailable('requestAuthScopes');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'requestAuthScopes', native.requestAuthScopes(scopes));
}
async function cancelAuthorization() {
    const native = requireAvailable('cancelAuthorization');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'cancelAuthorization', native.cancelAuthorization());
}
/**
 * Interactive scope request that also returns credentials.
 *
 * Prefer exchanging the returned `authCode` server-side over holding
 * `refreshToken` in the JS bundle.
 */
async function sendAuthScopesRequest(scopes, authType) {
    const native = requireAvailable('sendAuthScopesRequest');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'sendAuthScopesRequest', native.sendAuthScopesRequest(scopes, authType));
}
async function logout() {
    const native = requireAvailable('logout');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'logout', native.logout());
}
//# sourceMappingURL=index.js.map