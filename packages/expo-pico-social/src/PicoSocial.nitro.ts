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

  addFriendPresenceChangedListener(listener: (event: FriendPresenceChangedEvent) => void): number;
  addFriendRequestReceivedListener(listener: (request: FriendRequest) => void): number;
  addInviteReceivedListener(listener: (event: InviteReceivedEvent) => void): number;
  removeListener(id: number): void;
}
