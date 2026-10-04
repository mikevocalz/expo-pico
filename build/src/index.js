"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNotificationsAvailable = isNotificationsAvailable;
exports.getNotificationsSdkVersion = getNotificationsSdkVersion;
exports.getNotificationPermissionStatus = getNotificationPermissionStatus;
exports.requestPermissions = requestPermissions;
exports.registerForPushNotifications = registerForPushNotifications;
exports.unregisterForPushNotifications = unregisterForPushNotifications;
exports.addPushMessageListener = addPushMessageListener;
exports.addPushRevocationListener = addPushRevocationListener;
const platform_service_common_1 = require("@expo-pico/platform-service-common");
const PKG = '@expo-pico/notifications';
function native() {
    return (0, platform_service_common_1.resolveHybridObject)('PicoNotifications');
}
function isNotificationsAvailable() {
    return native()?.available ?? false;
}
function getNotificationsSdkVersion() {
    return native()?.sdkVersion ?? 'unavailable';
}
function getNotificationPermissionStatus() {
    return native()?.getPermissionStatus() ?? 'not-determined';
}
async function requestPermissions() {
    (0, platform_service_common_1.guardService)(isNotificationsAvailable(), PKG, 'requestPermissions');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'requestPermissions', native().requestPermissions());
}
async function registerForPushNotifications() {
    (0, platform_service_common_1.guardService)(isNotificationsAvailable(), PKG, 'registerForPushNotifications');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'registerForPushNotifications', native().registerForPushNotifications());
}
async function unregisterForPushNotifications() {
    (0, platform_service_common_1.guardService)(isNotificationsAvailable(), PKG, 'unregisterForPushNotifications');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'unregisterForPushNotifications', native().unregisterForPushNotifications());
}
function subscribe(register) {
    const hybrid = native();
    if (!hybrid?.available)
        return platform_service_common_1.NULL_SUBSCRIPTION;
    const id = register(hybrid);
    return { remove: () => hybrid.removeListener(id) };
}
/**
 * Fires for each incoming push. Registration alone only obtains a token — an
 * app with no listener can be addressed but never hears anything.
 */
function addPushMessageListener(listener) {
    return subscribe((h) => h.addPushMessageListener(listener));
}
/** Fires when the server revokes a previously delivered push. */
function addPushRevocationListener(listener) {
    return subscribe((h) => h.addPushRevocationListener(listener));
}
//# sourceMappingURL=index.js.map