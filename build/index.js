"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStorageAvailable = isStorageAvailable;
exports.getStorageSdkVersion = getStorageSdkVersion;
exports.getStorageStatus = getStorageStatus;
exports.saveEntry = saveEntry;
exports.loadEntry = loadEntry;
exports.deleteEntry = deleteEntry;
exports.listKeys = listKeys;
exports.syncStorage = syncStorage;
exports.getStorageQuota = getStorageQuota;
exports.clearLocalCache = clearLocalCache;
exports.addStorageConflictListener = addStorageConflictListener;
exports.addStorageSyncProgressListener = addStorageSyncProgressListener;
exports.addStorageSyncCompleteListener = addStorageSyncCompleteListener;
const platform_service_common_1 = require("@expo-pico/platform-service-common");
const PKG = '@expo-pico/storage';
function native() {
    return (0, platform_service_common_1.resolveHybridObject)('PicoStorage');
}
function isStorageAvailable() {
    return native()?.available ?? false;
}
function getStorageSdkVersion() {
    return native()?.sdkVersion ?? 'unavailable';
}
function getStorageStatus() {
    return native()?.status ?? 'unavailable';
}
async function saveEntry(key, value, type, options) {
    (0, platform_service_common_1.guardService)(isStorageAvailable(), PKG, 'saveEntry');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'saveEntry', native().saveEntry(key, value, type, options));
}
async function loadEntry(key) {
    (0, platform_service_common_1.guardService)(isStorageAvailable(), PKG, 'loadEntry');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'loadEntry', native().loadEntry(key));
}
async function deleteEntry(key) {
    (0, platform_service_common_1.guardService)(isStorageAvailable(), PKG, 'deleteEntry');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'deleteEntry', native().deleteEntry(key));
}
async function listKeys() {
    (0, platform_service_common_1.guardService)(isStorageAvailable(), PKG, 'listKeys');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'listKeys', native().listKeys());
}
async function syncStorage() {
    (0, platform_service_common_1.guardService)(isStorageAvailable(), PKG, 'syncStorage');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'syncStorage', native().syncStorage());
}
async function getStorageQuota() {
    (0, platform_service_common_1.guardService)(isStorageAvailable(), PKG, 'getStorageQuota');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getStorageQuota', native().getStorageQuota());
}
async function clearLocalCache() {
    (0, platform_service_common_1.guardService)(isStorageAvailable(), PKG, 'clearLocalCache');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'clearLocalCache', native().clearLocalCache());
}
function subscribe(register) {
    const hybrid = native();
    if (!hybrid?.available)
        return platform_service_common_1.NULL_SUBSCRIPTION;
    const id = register(hybrid);
    return { remove: () => hybrid.removeListener(id) };
}
function addStorageConflictListener(listener) {
    return subscribe((h) => h.addStorageConflictListener(listener));
}
function addStorageSyncProgressListener(listener) {
    return subscribe((h) => h.addStorageSyncProgressListener(listener));
}
function addStorageSyncCompleteListener(listener) {
    return subscribe((h) => h.addStorageSyncCompleteListener(listener));
}
//# sourceMappingURL=index.js.map