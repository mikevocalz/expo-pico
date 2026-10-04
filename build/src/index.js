"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRoomsAvailable = isRoomsAvailable;
exports.getRoomsSdkVersion = getRoomsSdkVersion;
exports.getRoomSessionState = getRoomSessionState;
exports.createRoom = createRoom;
exports.joinRoom = joinRoom;
exports.leaveRoom = leaveRoom;
exports.getRoomInfo = getRoomInfo;
exports.getFriendsAndRooms = getFriendsAndRooms;
exports.kickUser = kickUser;
exports.updateRoomData = updateRoomData;
exports.requestMatchmaking = requestMatchmaking;
exports.cancelMatchmaking = cancelMatchmaking;
exports.addRoomUpdatedListener = addRoomUpdatedListener;
exports.addRoomUserJoinedListener = addRoomUserJoinedListener;
exports.addRoomUserLeftListener = addRoomUserLeftListener;
exports.addMatchmakingFoundListener = addMatchmakingFoundListener;
const platform_service_common_1 = require("@expo-pico/platform-service-common");
const PKG = '@expo-pico/rooms';
const DISCONNECTED = {
    memberCount: 0,
    connectionState: 'disconnected',
};
function native() {
    return (0, platform_service_common_1.resolveHybridObject)('PicoRooms');
}
function isRoomsAvailable() {
    return native()?.available ?? false;
}
function getRoomsSdkVersion() {
    return native()?.sdkVersion ?? 'unavailable';
}
function getRoomSessionState() {
    return native()?.sessionState ?? DISCONNECTED;
}
async function createRoom(options) {
    (0, platform_service_common_1.guardService)(isRoomsAvailable(), PKG, 'createRoom');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'createRoom', native().createRoom(options));
}
async function joinRoom(roomId) {
    (0, platform_service_common_1.guardService)(isRoomsAvailable(), PKG, 'joinRoom');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'joinRoom', native().joinRoom(roomId));
}
async function leaveRoom() {
    (0, platform_service_common_1.guardService)(isRoomsAvailable(), PKG, 'leaveRoom');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'leaveRoom', native().leaveRoom());
}
async function getRoomInfo(roomId) {
    (0, platform_service_common_1.guardService)(isRoomsAvailable(), PKG, 'getRoomInfo');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getRoomInfo', native().getRoomInfo(roomId));
}
/**
 * Every room currently visible in the friends-and-rooms feed.
 *
 * Discovery feed, not a directory: only rooms a friend is in. Empty array when
 * none are. `memberCount` counts the friends visible in that room, not the
 * room's true occupancy, which PPS does not report.
 */
async function getFriendsAndRooms() {
    (0, platform_service_common_1.guardService)(isRoomsAvailable(), PKG, 'getFriendsAndRooms');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getFriendsAndRooms', native().getFriendsAndRooms());
}
async function kickUser(userId) {
    (0, platform_service_common_1.guardService)(isRoomsAvailable(), PKG, 'kickUser');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'kickUser', native().kickUser(userId));
}
async function updateRoomData(data) {
    (0, platform_service_common_1.guardService)(isRoomsAvailable(), PKG, 'updateRoomData');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'updateRoomData', native().updateRoomData(data));
}
// Unbacked seams: PPS 1.0.x has no matchmaking surface, so these throw
// NOT_IMPLEMENTED regardless of whether the native library is present.
// HybridPicoRooms rejects with the same code on the Kotlin side.
async function requestMatchmaking(_options) {
    throw (0, platform_service_common_1.notImplementedError)(PKG, 'requestMatchmaking', 'PPS 1.0.x has no matchmaking surface — use createRoom() + social.sendInvites() ' +
        '(or social.launchInviteUserJoinRoomFlow). Matchmaking was removed during the ' +
        'PVR→PPS SDK rewrite.');
}
async function cancelMatchmaking() {
    throw (0, platform_service_common_1.notImplementedError)(PKG, 'cancelMatchmaking', 'PPS 1.0.x has no matchmaking surface (matchmaking not supported).');
}
function subscribe(register) {
    const hybrid = native();
    if (!hybrid?.available)
        return platform_service_common_1.NULL_SUBSCRIPTION;
    const id = register(hybrid);
    return { remove: () => hybrid.removeListener(id) };
}
function addRoomUpdatedListener(listener) {
    return subscribe((h) => h.addRoomUpdatedListener(listener));
}
function addRoomUserJoinedListener(listener) {
    return subscribe((h) => h.addRoomUserJoinedListener(listener));
}
function addRoomUserLeftListener(listener) {
    return subscribe((h) => h.addRoomUserLeftListener(listener));
}
function addMatchmakingFoundListener(listener) {
    return subscribe((h) => h.addMatchmakingFoundListener(listener));
}
//# sourceMappingURL=index.js.map