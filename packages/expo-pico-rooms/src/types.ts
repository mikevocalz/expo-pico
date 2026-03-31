export type RoomConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'joined'
  | 'leaving'
  | 'error';

export type RoomJoinPolicy = 'everyone' | 'friends-only' | 'invite-only';

export type RoomMemberRole = 'owner' | 'moderator' | 'member';

export interface RoomMember {
  userId: string;
  displayName: string;
  role: RoomMemberRole;
  isPresent: boolean;
}

export interface RoomInfo {
  roomId: string;
  name: string | null;
  joinPolicy: RoomJoinPolicy;
  memberCount: number;
  maxMembers: number;
  /** Arbitrary key-value metadata set by the room owner at create time */
  data: Record<string, string>;
  members: RoomMember[];
}

export interface CreateRoomOptions {
  joinPolicy?: RoomJoinPolicy;
  maxMembers?: number;
  data?: Record<string, string>;
}

export interface JoinRoomResult {
  roomId: string;
  role: RoomMemberRole;
}

export interface MatchmakingOptions {
  poolName: string;
  data?: Record<string, string>;
}

/** Sync session state snapshot — reads atomically-cached native values */
export interface RoomSessionState {
  roomId: string | null;
  memberCount: number;
  connectionState: RoomConnectionState;
  role: RoomMemberRole | null;
}

// ─── Event payloads ──────────────────────────────────────────────────────────

export interface RoomUpdatedEvent {
  roomId: string;
  memberCount: number;
  data: Record<string, string>;
}

export interface RoomUserJoinedEvent {
  roomId: string;
  userId: string;
  displayName: string;
  role: RoomMemberRole;
}

export interface RoomUserLeftEvent {
  roomId: string;
  userId: string;
  reason: 'quit' | 'kicked' | 'disconnected';
}

export interface MatchmakingFoundEvent {
  roomId: string;
  poolName: string;
}
