"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSocialAvailable = isSocialAvailable;
exports.getSocialSdkVersion = getSocialSdkVersion;
exports.getCurrentUser = getCurrentUser;
exports.getFriendList = getFriendList;
exports.getFriendshipStatus = getFriendshipStatus;
exports.sendFriendRequest = sendFriendRequest;
exports.getPendingFriendRequests = getPendingFriendRequests;
exports.acceptFriendRequest = acceptFriendRequest;
exports.declineFriendRequest = declineFriendRequest;
exports.removeFriend = removeFriend;
exports.blockUser = blockUser;
exports.unblockUser = unblockUser;
exports.setPresence = setPresence;
exports.clearPresence = clearPresence;
exports.sendInvites = sendInvites;
exports.addFriendPresenceChangedListener = addFriendPresenceChangedListener;
exports.addFriendRequestReceivedListener = addFriendRequestReceivedListener;
exports.addInviteReceivedListener = addInviteReceivedListener;
exports.getLaunchDetails = getLaunchDetails;
exports.getDestinations = getDestinations;
exports.getInvitableUsers = getInvitableUsers;
exports.getSentInvites = getSentInvites;
exports.launchApp = launchApp;
exports.addLaunchDetailsListener = addLaunchDetailsListener;
exports.launchPresenceInvitePanel = launchPresenceInvitePanel;
exports.launchInviteUserJoinRoomFlow = launchInviteUserJoinRoomFlow;
exports.launchStore = launchStore;
exports.shareVideo = shareVideo;
exports.shareImages = shareImages;
const platform_service_common_1 = require("@expo-pico/platform-service-common");
const PKG = '@expo-pico/social';
function native() {
    return (0, platform_service_common_1.resolveHybridObject)('PicoSocial');
}
function isSocialAvailable() {
    return native()?.available ?? false;
}
function getSocialSdkVersion() {
    return native()?.sdkVersion ?? 'unavailable';
}
async function getCurrentUser() {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'getCurrentUser');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getCurrentUser', native().getCurrentUser());
}
async function getFriendList(pageSize, pageToken) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'getFriendList');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getFriendList', native().getFriendList(pageSize, pageToken));
}
async function getFriendshipStatus(userId) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'getFriendshipStatus');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getFriendshipStatus', native().getFriendshipStatus(userId));
}
async function sendFriendRequest(userId) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'sendFriendRequest');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'sendFriendRequest', native().sendFriendRequest(userId));
}
async function getPendingFriendRequests() {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'getPendingFriendRequests');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getPendingFriendRequests', native().getPendingFriendRequests());
}
// Removed in PPS 1.0.x — kept as typed seams that reject with NOT_IN_PPS_1_0.
async function acceptFriendRequest(requestId) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'acceptFriendRequest');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'acceptFriendRequest', native().acceptFriendRequest(requestId));
}
async function declineFriendRequest(requestId) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'declineFriendRequest');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'declineFriendRequest', native().declineFriendRequest(requestId));
}
async function removeFriend(userId) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'removeFriend');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'removeFriend', native().removeFriend(userId));
}
async function blockUser(userId) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'blockUser');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'blockUser', native().blockUser(userId));
}
async function unblockUser(userId) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'unblockUser');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'unblockUser', native().unblockUser(userId));
}
async function setPresence(options) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'setPresence');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'setPresence', native().setPresence(options));
}
async function clearPresence() {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'clearPresence');
    await (0, platform_service_common_1.wrapNativeCall)(PKG, 'clearPresence', native().clearPresence());
}
async function sendInvites(options) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'sendInvites');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'sendInvites', native().sendInvites(options));
}
function subscribe(register) {
    const hybrid = native();
    if (!hybrid?.available)
        return platform_service_common_1.NULL_SUBSCRIPTION;
    const id = register(hybrid);
    return { remove: () => hybrid.removeListener(id) };
}
// PPS 1.0.x pushes no friend-presence, friend-request or invite events. The
// PicoSocialClient and PicoFriendClient interfaces have no listener or
// callback registration for them; the only push it offers is the
// launch-intent callback behind addLaunchDetailsListener(). These listeners
// stay exported so callers keep compiling, but they warn once with
// NOT_IN_PPS_1_0 and return a subscription that never fires.
const warnedNotInPps = new Set();
function listenerNotInPps(method, reason) {
    if (!warnedNotInPps.has(method)) {
        warnedNotInPps.add(method);
        console.warn(`${PKG}: ${method}() NOT_IN_PPS_1_0 — ${reason} The listener will never fire.`);
    }
    return platform_service_common_1.NULL_SUBSCRIPTION;
}
/**
 * Unavailable on PPS 1.0.x: warns once with `NOT_IN_PPS_1_0` and never fires.
 * PPS has no presence-change push. Call `getFriendList()` when you need the
 * current friend list.
 */
function addFriendPresenceChangedListener(_listener) {
    return listenerNotInPps('addFriendPresenceChangedListener', 'PPS 1.0.x has no friend presence notification.');
}
/**
 * Unavailable on PPS 1.0.x: warns once with `NOT_IN_PPS_1_0` and never fires.
 * PPS has no friend-request push, and no API to list incoming requests.
 */
function addFriendRequestReceivedListener(_listener) {
    return listenerNotInPps('addFriendRequestReceivedListener', 'PPS 1.0.x has no friend request notification.');
}
/**
 * Unavailable on PPS 1.0.x: warns once with `NOT_IN_PPS_1_0` and never fires.
 * An accepted invite reaches the app as a launch instead: read
 * `getLaunchDetails()` at startup and subscribe with
 * `addLaunchDetailsListener()`, then check for `launchType === 'invite'`.
 */
function addInviteReceivedListener(_listener) {
    return listenerNotInPps('addInviteReceivedListener', 'PPS 1.0.x has no invite-received notification; an accepted invite arrives ' +
        "as a launch (getLaunchDetails() / addLaunchDetailsListener() with launchType 'invite').");
}
/**
 * Why this app instance was launched — an invite, a deep link, or a normal
 * open. Synchronous and never throws: when PPS is absent it reports a normal
 * launch, so startup code can read it without guarding on availability.
 */
function getLaunchDetails() {
    return (native()?.getLaunchDetails() ?? {
        launchType: 'normal',
        launchResult: 'unknown',
        launchSource: '',
        deepLinkMessage: '',
        destinationApiName: '',
        trackingId: '',
        lobbySessionId: '',
        matchSessionId: '',
        extra: '',
        clientAction: '',
    });
}
/**
 * Destinations declared in the developer console.
 *
 * Pass the previous result's `nextPageToken` to page. Its absence means there
 * are no further pages, so there is no separate `hasMore` to check.
 */
async function getDestinations(pageToken) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'getDestinations');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getDestinations', native().getDestinations(pageToken));
}
/** Users invitable to the current destination. `suggestedUserIds` biases the list. */
async function getInvitableUsers(suggestedUserIds, pageToken) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'getInvitableUsers');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getInvitableUsers', native().getInvitableUsers(suggestedUserIds, pageToken));
}
/** Invites this user has already sent. */
async function getSentInvites(pageToken) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'getSentInvites');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'getSentInvites', native().getSentInvites(pageToken));
}
/** Launches another PICO app by app id or package name. */
async function launchApp(options) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'launchApp');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'launchApp', native().launchApp(options));
}
/**
 * Fires when the launch intent changes while the app is running — the user
 * accepting an invite without a restart, for example. Use `getLaunchDetails()`
 * for the intent the app started with.
 *
 * Backed by PPS `ISocialClient.setLaunchIntentChangeCallback`; the native
 * module also feeds intents from `onNewIntent` to PPS. Returns a no-op
 * subscription when PPS is absent.
 */
function addLaunchDetailsListener(listener) {
    return subscribe((h) => h.addLaunchDetailsListener(listener));
}
async function launchPresenceInvitePanel() {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'launchPresenceInvitePanel');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'launchPresenceInvitePanel', native().launchPresenceInvitePanel());
}
/** Opens the system flow for inviting friends into `roomId`. */
async function launchInviteUserJoinRoomFlow(roomId) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'launchInviteUserJoinRoomFlow');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'launchInviteUserJoinRoomFlow', native().launchInviteUserJoinRoomFlow(roomId));
}
async function launchStore() {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'launchStore');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'launchStore', native().launchStore());
}
async function shareVideo(videoPath, description) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'shareVideo');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'shareVideo', native().shareVideo(videoPath, description));
}
async function shareImages(imagePaths) {
    (0, platform_service_common_1.guardService)(isSocialAvailable(), PKG, 'shareImages');
    return (0, platform_service_common_1.wrapNativeCall)(PKG, 'shareImages', native().shareImages(imagePaths));
}
//# sourceMappingURL=index.js.map