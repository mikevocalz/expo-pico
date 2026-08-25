import type { HybridObject } from 'react-native-nitro-modules';

export type RoomConnectionState = 'disconnected' | 'connecting' | 'joined' | 'leaving' | 'error';
export type RoomJoinPolicy = 'everyone' | 'friends-only' | 'invite-only';
export type RoomMemberRole = 'owner' | 'moderator' | 'member';
export type RoomLeaveReason = 'quit' | 'kicked' | 'disconnected';

export interface RoomMember {
  userId: string;
  displayName: string;
  role: RoomMemberRole;
  isPresent: boolean;
}

export interface RoomInfo {
  roomId: string;
  name?: string;
  joinPolicy: RoomJoinPolicy;
  memberCount: number;
  maxMembers: number;
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

export interface RoomSessionState {
  roomId?: string;
  memberCount: number;
  connectionState: RoomConnectionState;
  role?: RoomMemberRole;
}

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
  reason: RoomLeaveReason;
}

export interface MatchmakingFoundEvent {
  roomId: string;
  poolName: string;
}

/**
 * PPS 1.0.x removed dedicated rooms. Every method here returns
 * NOT_IN_PPS_1_0 today; the interface is kept so a future PPS release can
 * wire it without an API break. Run live session state on Fishjam or Colyseus.
 */
export interface PicoRooms extends HybridObject<{ android: 'kotlin' }> {
  readonly available: boolean;
  readonly sdkVersion: string;
  readonly sessionState: RoomSessionState;

  createRoom(options?: CreateRoomOptions): Promise<RoomInfo>;
  joinRoom(roomId: string): Promise<JoinRoomResult>;
  leaveRoom(): Promise<void>;
  getRoomInfo(roomId: string): Promise<RoomInfo>;
  kickUser(userId: string): Promise<void>;
  updateRoomData(data: Record<string, string>): Promise<void>;
  requestMatchmaking(options: MatchmakingOptions): Promise<void>;
  cancelMatchmaking(): Promise<void>;

  addRoomUpdatedListener(listener: (event: RoomUpdatedEvent) => void): number;
  addRoomUserJoinedListener(listener: (event: RoomUserJoinedEvent) => void): number;
  addRoomUserLeftListener(listener: (event: RoomUserLeftEvent) => void): number;
  addMatchmakingFoundListener(listener: (event: MatchmakingFoundEvent) => void): number;
  removeListener(id: number): void;
}
