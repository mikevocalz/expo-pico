"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRtcAvailable = isRtcAvailable;
exports.getRtcServiceStatus = getRtcServiceStatus;
exports.getRtcSdkVersion = getRtcSdkVersion;
exports.initRtcEngine = initRtcEngine;
exports.joinChannel = joinChannel;
exports.leaveChannel = leaveChannel;
exports.muteLocalAudio = muteLocalAudio;
exports.setAudioOutputVolume = setAudioOutputVolume;
exports.addUserJoinedListener = addUserJoinedListener;
exports.addUserLeftListener = addUserLeftListener;
exports.addRtcStateChangeListener = addRtcStateChangeListener;
const platform_service_common_1 = require("@expo-pico/platform-service-common");
const PKG = '@expo-pico/rtc';
function native() {
    return (0, platform_service_common_1.resolveHybridObject)('PicoRtc');
}
function isRtcAvailable() {
    return native()?.available ?? false;
}
function getRtcServiceStatus() {
    return native()?.status ?? 'unavailable';
}
function getRtcSdkVersion() {
    return native()?.sdkVersion ?? null;
}
async function initRtcEngine(options) {
    (0, platform_service_common_1.guardService)(isRtcAvailable(), PKG, 'initRtcEngine');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'initRtcEngine', native().initRtcEngine(options));
}
async function joinChannel(options) {
    (0, platform_service_common_1.guardService)(isRtcAvailable(), PKG, 'joinChannel');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'joinChannel', native().joinChannel(options));
}
async function leaveChannel() {
    (0, platform_service_common_1.guardService)(isRtcAvailable(), PKG, 'leaveChannel');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'leaveChannel', native().leaveChannel());
}
async function muteLocalAudio(muted) {
    (0, platform_service_common_1.guardService)(isRtcAvailable(), PKG, 'muteLocalAudio');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'muteLocalAudio', native().muteLocalAudio(muted));
}
async function setAudioOutputVolume(volume) {
    (0, platform_service_common_1.guardService)(isRtcAvailable(), PKG, 'setAudioOutputVolume');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'setAudioOutputVolume', native().setAudioOutputVolume(volume));
}
function subscribe(register) {
    const hybrid = native();
    if (!hybrid?.available)
        return platform_service_common_1.NULL_SUBSCRIPTION;
    const id = register(hybrid);
    return { remove: () => hybrid.removeListener(id) };
}
function addUserJoinedListener(listener) {
    return subscribe((h) => h.addUserJoinedListener(listener));
}
function addUserLeftListener(listener) {
    return subscribe((h) => h.addUserLeftListener(listener));
}
function addRtcStateChangeListener(listener) {
    return subscribe((h) => h.addRtcStateChangeListener(listener));
}
//# sourceMappingURL=index.js.map