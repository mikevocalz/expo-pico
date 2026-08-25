import type { HybridObject } from 'react-native-nitro-modules';

export type FriendshipStatus =
  | 'friends'
  | 'pending-sent'
  | 'pending-received'
  | 'not-friends'
  | 'blocked';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface SocialUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  presenceStatus: PresenceStatus;
  presenceRichText?: string;
  isInSameApp: boolean;
}

export interface FriendRequest {
  requestId: string;
  fromUser: SocialUser;
  toUserId: string;
  sentAt: number;
}

export interface FriendListResult {
  friends: SocialUser[];
  nextPageToken?: string;
  totalCount: number;
}

export interface SentInvite {
  inviteId: string;
  toUserId: string;
  destinationApiName: string;
  sentAt: number;
  expiresAt: number;
}

export interface InviteOptions {
  destinationApiName: string;
  /** Up to 8 user IDs. */
  userIds: string[];
  data?: Record<string, string>;
}

export interface PresenceOptions {
  status: PresenceStatus;
  richText?: string;
  destinationApiName?: string;
}

export interface FriendPresenceChangedEvent {
  userId: string;
  previousStatus: PresenceStatus;
  currentStatus: PresenceStatus;
  richText?: string;
}

export interface InviteReceivedEvent {
  inviteId: string;
  fromUser: SocialUser;
  destinationApiName: string;
  data: Record<string, string>;
}

/**
 * accept/decline/block/unblock were removed in PPS 1.0.x. They stay on the
 * interface as typed seams returning NOT_IN_PPS_1_0 so a future PPS release
 * can wire them without a breaking API change.
 */
/** Why the app was launched. `normal` means the user opened it directly. */
export type PicoLaunchType = 'unknown' | 'normal' | 'invite' | 'coordinated' | 'deeplink';

/** Outcome of a coordinated/invite launch. */
export type PicoLaunchResult =
  | 'unknown'
  | 'success'
  | 'failed-room-full'
  | 'failed-game-already-started'
  | 'failed-room-not-found'
  | 'failed-user-declined'
  | 'failed-other';

/**
 * Why this app instance was launched.
 *
 * Read synchronously — PPS returns it from a getter, not a Task, because the
 * launch intent is already resolved by the time the app runs.
 */
export interface PicoLaunchDetails {
  launchType: PicoLaunchType;
  launchResult: PicoLaunchResult;
  launchSource: string;
  deepLinkMessage: string;
  destinationApiName: string;
  trackingId: string;
  lobbySessionId: string;
  matchSessionId: string;
  extra: string;
  clientAction: string;
}

/** A travel destination declared in the PICO developer console. */
export interface PicoDestination {
  apiName: string;
  displayName: string;
  deepLinkMessage: string;
}

export interface PicoSocial extends HybridObject<{ android: 'kotlin' }> {
  readonly available: boolean;
  readonly sdkVersion: string;

  getCurrentUser(): Promise<SocialUser>;
  getFriendList(pageSize?: number, pageToken?: string): Promise<FriendListResult>;
  getFriendshipStatus(userId: string): Promise<FriendshipStatus>;
  sendFriendRequest(userId: string): Promise<FriendRequest>;
  getPendingFriendRequests(): Promise<FriendRequest[]>;

  acceptFriendRequest(requestId: string): Promise<void>;
  declineFriendRequest(requestId: string): Promise<void>;
  removeFriend(userId: string): Promise<void>;
  blockUser(userId: string): Promise<void>;
  unblockUser(userId: string): Promise<void>;

  setPresence(options: PresenceOptions): Promise<void>;
  clearPresence(): Promise<void>;
  sendInvites(options: InviteOptions): Promise<SentInvite[]>;

  /** Why this app instance was launched. Synchronous; never throws. */
  getLaunchDetails(): PicoLaunchDetails;
  /** Destinations declared in the developer console. First page only. */
  getDestinations(): Promise<PicoDestination[]>;
  /** Opens the system invite panel for the current presence. */
  launchPresenceInvitePanel(): Promise<boolean>;
  /** Opens the system flow inviting friends into `roomId`. */
  launchInviteUserJoinRoomFlow(roomId: string): Promise<boolean>;
  /** Opens the PICO store. Resolves with the raw PPS result string. */
  launchStore(): Promise<string>;
  /** Shares a video to the PICO social feed. */
  shareVideo(videoPath: string, description: string): Promise<boolean>;
  /** Shares up to a handful of images to the PICO social feed. */
  shareImages(imagePaths: string[]): Promise<boolean>;

  addFriendPresenceChangedListener(listener: (event: FriendPresenceChangedEvent) => void): number;
  addFriendRequestReceivedListener(listener: (request: FriendRequest) => void): number;
  addInviteReceivedListener(listener: (event: InviteReceivedEvent) => void): number;
  removeListener(id: number): void;
}
