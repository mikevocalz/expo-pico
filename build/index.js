"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAchievementsAvailable = isAchievementsAvailable;
exports.getAchievementsSdkVersion = getAchievementsSdkVersion;
exports.getAllAchievements = getAllAchievements;
exports.getUnlockedAchievements = getUnlockedAchievements;
exports.getAchievementProgress = getAchievementProgress;
exports.unlockAchievement = unlockAchievement;
exports.addAchievementCount = addAchievementCount;
exports.addAchievementBitfield = addAchievementBitfield;
exports.addAchievementUnlockedListener = addAchievementUnlockedListener;
const platform_service_common_1 = require("@expo-pico/platform-service-common");
const PKG = '@expo-pico/achievements';
function native() {
    return (0, platform_service_common_1.resolveHybridObject)('PicoAchievements');
}
function isAchievementsAvailable() {
    return native()?.available ?? false;
}
function getAchievementsSdkVersion() {
    return native()?.sdkVersion ?? 'unavailable';
}
async function getAllAchievements() {
    (0, platform_service_common_1.guardService)(isAchievementsAvailable(), PKG, 'getAllAchievements');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getAllAchievements', native().getAllAchievements());
}
async function getUnlockedAchievements() {
    (0, platform_service_common_1.guardService)(isAchievementsAvailable(), PKG, 'getUnlockedAchievements');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getUnlockedAchievements', native().getUnlockedAchievements());
}
async function getAchievementProgress(apiNames) {
    (0, platform_service_common_1.guardService)(isAchievementsAvailable(), PKG, 'getAchievementProgress');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getAchievementProgress', native().getAchievementProgress(apiNames));
}
async function unlockAchievement(apiName) {
    (0, platform_service_common_1.guardService)(isAchievementsAvailable(), PKG, 'unlockAchievement');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'unlockAchievement', native().unlockAchievement(apiName));
}
async function addAchievementCount(apiName, count) {
    (0, platform_service_common_1.guardService)(isAchievementsAvailable(), PKG, 'addAchievementCount');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'addAchievementCount', native().addAchievementCount(apiName, count));
}
async function addAchievementBitfield(apiName, bits) {
    (0, platform_service_common_1.guardService)(isAchievementsAvailable(), PKG, 'addAchievementBitfield');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'addAchievementBitfield', native().addAchievementBitfield(apiName, bits));
}
/**
 * Nitro listeners are id-based; the Subscription shape is preserved here so the
 * public API is unchanged from the Expo Modules version.
 */
function addAchievementUnlockedListener(listener) {
    const hybrid = native();
    if (!hybrid?.available)
        return platform_service_common_1.NULL_SUBSCRIPTION;
    const id = hybrid.addAchievementUnlockedListener(listener);
    return { remove: () => hybrid.removeAchievementUnlockedListener(id) };
}
//# sourceMappingURL=index.js.map