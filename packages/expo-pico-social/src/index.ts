import {
  guardService,
  wrapNativeCall,
  resolveHybridObject,
  NULL_SUBSCRIPTION,
  type Subscription,
} from '@expo-pico/platform-service-common';
import type {
  PicoSocial,
  PresenceOptions,
  InviteOptions,
  FriendRequest,
  FriendPresenceChangedEvent,
  InviteReceivedEvent,
  PicoLaunchDetails,
  LaunchAppOptions,
} from './types';

export type {
  FriendshipStatus,
  PresenceStatus,
  SocialUser,
  FriendRequest,
  FriendListResult,
  SentInvite,
  InviteOptions,
  PresenceOptions,
  FriendPresenceChangedEvent,
  InviteReceivedEvent,
  PicoLaunchDetails,
} from './types';

const PKG = '@expo-pico/social';

function native(): PicoSocial | null {
  return resolveHybridObject<PicoSocial>('PicoSocial');
}

export function isSocialAvailable(): boolean {
  return native()?.available ?? false;
}

export function getSocialSdkVersion(): string {
  return native()?.sdkVersion ?? 'unavailable';
}

export async function getCurrentUser() {
  guardService(isSocialAvailable(), PKG, 'getCurrentUser');
  return wrapNativeCall(PKG, 'getCurrentUser', native()!.getCurrentUser());
}

export async function getFriendList(pageSize?: number, pageToken?: string) {
  guardService(isSocialAvailable(), PKG, 'getFriendList');
  return wrapNativeCall(PKG, 'getFriendList', native()!.getFriendList(pageSize, pageToken));
}

export async function getFriendshipStatus(userId: string) {
  guardService(isSocialAvailable(), PKG, 'getFriendshipStatus');
  return wrapNativeCall(PKG, 'getFriendshipStatus', native()!.getFriendshipStatus(userId));
}

export async function sendFriendRequest(userId: string) {
  guardService(isSocialAvailable(), PKG, 'sendFriendRequest');
  return wrapNativeCall(PKG, 'sendFriendRequest', native()!.sendFriendRequest(userId));
}

export async function getPendingFriendRequests() {
  guardService(isSocialAvailable(), PKG, 'getPendingFriendRequests');
  return wrapNativeCall(PKG, 'getPendingFriendRequests', native()!.getPendingFriendRequests());
}

// Removed in PPS 1.0.x — kept as typed seams that reject with NOT_IN_PPS_1_0.

export async function acceptFriendRequest(requestId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'acceptFriendRequest');
  await wrapNativeCall(PKG, 'acceptFriendRequest', native()!.acceptFriendRequest(requestId));
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'declineFriendRequest');
  await wrapNativeCall(PKG, 'declineFriendRequest', native()!.declineFriendRequest(requestId));
}

export async function removeFriend(userId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'removeFriend');
  await wrapNativeCall(PKG, 'removeFriend', native()!.removeFriend(userId));
}

export async function blockUser(userId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'blockUser');
  await wrapNativeCall(PKG, 'blockUser', native()!.blockUser(userId));
}

export async function unblockUser(userId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'unblockUser');
  await wrapNativeCall(PKG, 'unblockUser', native()!.unblockUser(userId));
}

export async function setPresence(options: PresenceOptions): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'setPresence');
  await wrapNativeCall(PKG, 'setPresence', native()!.setPresence(options));
}

export async function clearPresence(): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'clearPresence');
  await wrapNativeCall(PKG, 'clearPresence', native()!.clearPresence());
}

export async function sendInvites(options: InviteOptions) {
  guardService(isSocialAvailable(), PKG, 'sendInvites');
  return wrapNativeCall(PKG, 'sendInvites', native()!.sendInvites(options));
}

function subscribe(register: (h: PicoSocial) => number): Subscription {
  const hybrid = native();
  if (!hybrid?.available) return NULL_SUBSCRIPTION;
  const id = register(hybrid);
  return { remove: () => hybrid.removeListener(id) };
}

// PPS 1.0.x pushes no friend-presence, friend-request or invite events. The
// PicoSocialClient and PicoFriendClient interfaces have no listener or
// callback registration for them; the only push it offers is the
// launch-intent callback behind addLaunchDetailsListener(). These listeners
// stay exported so callers keep compiling, but they warn once with
// NOT_IN_PPS_1_0 and return a subscription that never fires.
const warnedNotInPps = new Set<string>();

// This package compiles with lib ES2020 and no DOM or Node types, so declare
// the one console method it uses. React Native provides it at runtime.
declare const console: { warn(message: string): void };

function listenerNotInPps(method: string, reason: string): Subscription {
  if (!warnedNotInPps.has(method)) {
    warnedNotInPps.add(method);
    console.warn(`${PKG}: ${method}() NOT_IN_PPS_1_0 — ${reason} The listener will never fire.`);
  }
  return NULL_SUBSCRIPTION;
}

/**
 * Unavailable on PPS 1.0.x: warns once with `NOT_IN_PPS_1_0` and never fires.
 * PPS has no presence-change push. Call `getFriendList()` when you need the
 * current friend list.
 */
export function addFriendPresenceChangedListener(
  _listener: (event: FriendPresenceChangedEvent) => void
): Subscription {
  return listenerNotInPps(
    'addFriendPresenceChangedListener',
    'PPS 1.0.x has no friend presence notification.'
  );
}

/**
 * Unavailable on PPS 1.0.x: warns once with `NOT_IN_PPS_1_0` and never fires.
 * PPS has no friend-request push, and no API to list incoming requests.
 */
export function addFriendRequestReceivedListener(
  _listener: (request: FriendRequest) => void
): Subscription {
  return listenerNotInPps(
    'addFriendRequestReceivedListener',
    'PPS 1.0.x has no friend request notification.'
  );
}

/**
 * Unavailable on PPS 1.0.x: warns once with `NOT_IN_PPS_1_0` and never fires.
 * An accepted invite reaches the app as a launch instead: read
 * `getLaunchDetails()` at startup and subscribe with
 * `addLaunchDetailsListener()`, then check for `launchType === 'invite'`.
 */
export function addInviteReceivedListener(
  _listener: (event: InviteReceivedEvent) => void
): Subscription {
  return listenerNotInPps(
    'addInviteReceivedListener',
    'PPS 1.0.x has no invite-received notification; an accepted invite arrives ' +
      "as a launch (getLaunchDetails() / addLaunchDetailsListener() with launchType 'invite')."
  );
}

/**
 * Why this app instance was launched — an invite, a deep link, or a normal
 * open. Synchronous and never throws: when PPS is absent it reports a normal
 * launch, so startup code can read it without guarding on availability.
 */
export function getLaunchDetails(): PicoLaunchDetails {
  return (
    native()?.getLaunchDetails() ?? {
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
    }
  );
}

/**
 * Destinations declared in the developer console.
 *
 * Pass the previous result's `nextPageToken` to page. Its absence means there
 * are no further pages, so there is no separate `hasMore` to check.
 */
export async function getDestinations(pageToken?: string) {
  guardService(isSocialAvailable(), PKG, 'getDestinations');
  return wrapNativeCall(PKG, 'getDestinations', native()!.getDestinations(pageToken));
}

/** Users invitable to the current destination. `suggestedUserIds` biases the list. */
export async function getInvitableUsers(suggestedUserIds?: string[], pageToken?: string) {
  guardService(isSocialAvailable(), PKG, 'getInvitableUsers');
  return wrapNativeCall(
    PKG,
    'getInvitableUsers',
    native()!.getInvitableUsers(suggestedUserIds, pageToken)
  );
}

/** Invites this user has already sent. */
export async function getSentInvites(pageToken?: string) {
  guardService(isSocialAvailable(), PKG, 'getSentInvites');
  return wrapNativeCall(PKG, 'getSentInvites', native()!.getSentInvites(pageToken));
}

/** Launches another PICO app by app id or package name. */
export async function launchApp(options: LaunchAppOptions) {
  guardService(isSocialAvailable(), PKG, 'launchApp');
  return wrapNativeCall(PKG, 'launchApp', native()!.launchApp(options));
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
export function addLaunchDetailsListener(
  listener: (details: PicoLaunchDetails) => void
): Subscription {
  return subscribe((h) => h.addLaunchDetailsListener(listener));
}

export async function launchPresenceInvitePanel() {
  guardService(isSocialAvailable(), PKG, 'launchPresenceInvitePanel');
  return wrapNativeCall(PKG, 'launchPresenceInvitePanel', native()!.launchPresenceInvitePanel());
}

/** Opens the system flow for inviting friends into `roomId`. */
export async function launchInviteUserJoinRoomFlow(roomId: string) {
  guardService(isSocialAvailable(), PKG, 'launchInviteUserJoinRoomFlow');
  return wrapNativeCall(
    PKG,
    'launchInviteUserJoinRoomFlow',
    native()!.launchInviteUserJoinRoomFlow(roomId)
  );
}

export async function launchStore() {
  guardService(isSocialAvailable(), PKG, 'launchStore');
  return wrapNativeCall(PKG, 'launchStore', native()!.launchStore());
}

export async function shareVideo(videoPath: string, description: string) {
  guardService(isSocialAvailable(), PKG, 'shareVideo');
  return wrapNativeCall(PKG, 'shareVideo', native()!.shareVideo(videoPath, description));
}

export async function shareImages(imagePaths: string[]) {
  guardService(isSocialAvailable(), PKG, 'shareImages');
  return wrapNativeCall(PKG, 'shareImages', native()!.shareImages(imagePaths));
}
