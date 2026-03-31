export type FriendshipStatus =
  | 'friends'
  | 'pending-sent'
  | 'pending-received'
  | 'not-friends'
  | 'blocked';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface PicoUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  presenceStatus: PresenceStatus;
  presenceRichText: string | null;
  /** True if this user is currently in the same app */
  isInSameApp: boolean;
}

export interface FriendRequest {
  requestId: string;
  fromUser: PicoUser;
  toUserId: string;
  sentAt: number;
}

export interface FriendListResult {
  friends: PicoUser[];
  nextPageToken: string | null;
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
  /** API name of destination (lobby, match, etc.) */
  destinationApiName: string;
  /** Up to 8 user IDs to invite */
  userIds: string[];
  /** Optional extra data to attach to the invite */
  data?: Record<string, string>;
}

export interface PresenceOptions {
  status: PresenceStatus;
  richText?: string;
  /** API name describing what the user is doing */
  destinationApiName?: string;
}

export interface FriendPresenceChangedEvent {
  userId: string;
  previousStatus: PresenceStatus;
  currentStatus: PresenceStatus;
  richText: string | null;
}

export interface FriendRequestReceivedEvent {
  request: FriendRequest;
}

export interface InviteReceivedEvent {
  inviteId: string;
  fromUser: PicoUser;
  destinationApiName: string;
  data: Record<string, string>;
}
