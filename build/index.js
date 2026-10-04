"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLeaderboardsAvailable = isLeaderboardsAvailable;
exports.getLeaderboardsSdkVersion = getLeaderboardsSdkVersion;
exports.getAllLeaderboards = getAllLeaderboards;
exports.getEntries = getEntries;
exports.getEntriesAfterRank = getEntriesAfterRank;
exports.getUserEntry = getUserEntry;
exports.writeScore = writeScore;
const platform_service_common_1 = require("@expo-pico/platform-service-common");
const PKG = '@expo-pico/leaderboards';
function native() {
    return (0, platform_service_common_1.resolveHybridObject)('PicoLeaderboards');
}
function isLeaderboardsAvailable() {
    return native()?.available ?? false;
}
function getLeaderboardsSdkVersion() {
    return native()?.sdkVersion ?? 'unavailable';
}
async function getAllLeaderboards() {
    (0, platform_service_common_1.guardService)(isLeaderboardsAvailable(), PKG, 'getAllLeaderboards');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getAllLeaderboards', native().getAllLeaderboards());
}
async function getEntries(apiName, options) {
    (0, platform_service_common_1.guardService)(isLeaderboardsAvailable(), PKG, 'getEntries');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getEntries', native().getEntries(apiName, options));
}
async function getEntriesAfterRank(apiName, afterRank, options) {
    (0, platform_service_common_1.guardService)(isLeaderboardsAvailable(), PKG, 'getEntriesAfterRank');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getEntriesAfterRank', native().getEntriesAfterRank(apiName, afterRank, options));
}
/** Emulated by scanning entries — PPS has no single-user lookup. */
async function getUserEntry(apiName) {
    (0, platform_service_common_1.guardService)(isLeaderboardsAvailable(), PKG, 'getUserEntry');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getUserEntry', native().getUserEntry(apiName));
}
async function writeScore(apiName, score, options) {
    (0, platform_service_common_1.guardService)(isLeaderboardsAvailable(), PKG, 'writeScore');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'writeScore', native().writeScore(apiName, score, options));
}
//# sourceMappingURL=index.js.map