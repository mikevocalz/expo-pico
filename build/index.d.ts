import { type Subscription } from '@expo-pico/platform-service-common';
import type { PresenceOptions, InviteOptions, FriendRequest, FriendPresenceChangedEvent, InviteReceivedEvent, PicoLaunchDetails, LaunchAppOptions } from './types';
export type { FriendshipStatus, PresenceStatus, SocialUser, FriendRequest, FriendListResult, SentInvite, InviteOptions, PresenceOptions, FriendPresenceChangedEvent, InviteReceivedEvent, PicoLaunchDetails, } from './types';
export declare function isSocialAvailable(): boolean;
export declare function getSocialSdkVersion(): string;
export declare function getCurrentUser(): Promise<import("./types").SocialUser>;
export declare function getFriendList(pageSize?: number, pageToken?: string): Promise<import("./types").FriendListResult>;
export declare function getFriendshipStatus(userId: string): Promise<import("./types").FriendshipStatus>;
export declare function sendFriendRequest(userId: string): Promise<FriendRequest>;
export declare function getPendingFriendRequests(): Promise<FriendRequest[]>;
export declare function acceptFriendRequest(requestId: string): Promise<void>;
export declare function declineFriendRequest(requestId: string): Promise<void>;
export declare function removeFriend(userId: string): Promise<void>;
export declare function blockUser(userId: string): Promise<void>;
export declare function unblockUser(userId: string): Promise<void>;
export declare function setPresence(options: PresenceOptions): Promise<void>;
export declare function clearPresence(): Promise<void>;
export declare function sendInvites(options: InviteOptions): Promise<import("./types").SentInvite[]>;
/**
 * Unavailable on PPS 1.0.x: warns once with `NOT_IN_PPS_1_0` and never fires.
 * PPS has no presence-change push. Call `getFriendList()` when you need the
 * current friend list.
 */
export declare function addFriendPresenceChangedListener(_listener: (event: FriendPresenceChangedEvent) => void): Subscription;
/**
 * Unavailable on PPS 1.0.x: warns once with `NOT_IN_PPS_1_0` and never fires.
 * PPS has no friend-request push, and no API to list incoming requests.
 */
export declare function addFriendRequestReceivedListener(_listener: (request: FriendRequest) => void): Subscription;
/**
 * Unavailable on PPS 1.0.x: warns once with `NOT_IN_PPS_1_0` and never fires.
 * An accepted invite reaches the app as a launch instead: read
 * `getLaunchDetails()` at startup and subscribe with
 * `addLaunchDetailsListener()`, then check for `launchType === 'invite'`.
 */
export declare function addInviteReceivedListener(_listener: (event: InviteReceivedEvent) => void): Subscription;
/**
 * Why this app instance was launched — an invite, a deep link, or a normal
 * open. Synchronous and never throws: when PPS is absent it reports a normal
 * launch, so startup code can read it without guarding on availability.
 */
export declare function getLaunchDetails(): PicoLaunchDetails;
/**
 * Destinations declared in the developer console.
 *
 * Pass the previous result's `nextPageToken` to page. Its absence means there
 * are no further pages, so there is no separate `hasMore` to check.
 */
export declare function getDestinations(pageToken?: string): Promise<import("./types").DestinationListResult>;
/** Users invitable to the current destination. `suggestedUserIds` biases the list. */
export declare function getInvitableUsers(suggestedUserIds?: string[], pageToken?: string): Promise<import("./types").InvitableUsersResult>;
/** Invites this user has already sent. */
export declare function getSentInvites(pageToken?: string): Promise<import("./types").SentInviteListResult>;
/** Launches another PICO app by app id or package name. */
export declare function launchApp(options: LaunchAppOptions): Promise<string>;
/**
 * Fires when the launch intent changes while the app is running — the user
 * accepting an invite without a restart, for example. Use `getLaunchDetails()`
 * for the intent the app started with.
 *
 * Backed by PPS `ISocialClient.setLaunchIntentChangeCallback`; the native
 * module also feeds intents from `onNewIntent` to PPS. Returns a no-op
 * subscription when PPS is absent.
 */
export declare function addLaunchDetailsListener(listener: (details: PicoLaunchDetails) => void): Subscription;
export declare function launchPresenceInvitePanel(): Promise<boolean>;
/** Opens the system flow for inviting friends into `roomId`. */
export declare function launchInviteUserJoinRoomFlow(roomId: string): Promise<boolean>;
export declare function launchStore(): Promise<string>;
export declare function shareVideo(videoPath: string, description: string): Promise<boolean>;
export declare function shareImages(imagePaths: string[]): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map