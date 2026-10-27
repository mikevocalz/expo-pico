// The Nitro spec in PicoRooms.nitro.ts is the single source of these types;
// this module re-exports them under the path the package has always used.
export type {
  RoomConnectionState,
  RoomJoinPolicy,
  RoomMemberRole,
  RoomLeaveReason,
  RoomMember,
  RoomInfo,
  CreateRoomOptions,
  JoinRoomResult,
  MatchmakingOptions,
  RoomSessionState,
  RoomUpdatedEvent,
  RoomUserJoinedEvent,
  RoomUserLeftEvent,
  MatchmakingFoundEvent,
  PicoRooms,
} from './PicoRooms.nitro';
