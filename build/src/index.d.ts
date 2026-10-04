import { type Subscription } from '@expo-pico/platform-service-common';
import type { RoomSessionState, CreateRoomOptions, MatchmakingOptions, RoomUpdatedEvent, RoomUserJoinedEvent, RoomUserLeftEvent, MatchmakingFoundEvent } from './types';
export type { RoomConnectionState, RoomJoinPolicy, RoomMemberRole, RoomLeaveReason, RoomMember, RoomInfo, CreateRoomOptions, JoinRoomResult, MatchmakingOptions, RoomSessionState, RoomUpdatedEvent, RoomUserJoinedEvent, RoomUserLeftEvent, MatchmakingFoundEvent, } from './types';
export declare function isRoomsAvailable(): boolean;
export declare function getRoomsSdkVersion(): string;
export declare function getRoomSessionState(): RoomSessionState;
export declare function createRoom(options?: CreateRoomOptions): Promise<import("./types").RoomInfo>;
export declare function joinRoom(roomId: string): Promise<import("./types").JoinRoomResult>;
export declare function leaveRoom(): Promise<void>;
export declare function getRoomInfo(roomId: string): Promise<import("./types").RoomInfo>;
/**
 * Every room currently visible in the friends-and-rooms feed.
 *
 * Discovery feed, not a directory: only rooms a friend is in. Empty array when
 * none are. `memberCount` counts the friends visible in that room, not the
 * room's true occupancy, which PPS does not report.
 */
export declare function getFriendsAndRooms(): Promise<import("./types").RoomInfo[]>;
export declare function kickUser(userId: string): Promise<void>;
export declare function updateRoomData(data: Record<string, string>): Promise<void>;
export declare function requestMatchmaking(_options: MatchmakingOptions): Promise<void>;
export declare function cancelMatchmaking(): Promise<void>;
export declare function addRoomUpdatedListener(listener: (event: RoomUpdatedEvent) => void): Subscription;
export declare function addRoomUserJoinedListener(listener: (event: RoomUserJoinedEvent) => void): Subscription;
export declare function addRoomUserLeftListener(listener: (event: RoomUserLeftEvent) => void): Subscription;
export declare function addMatchmakingFoundListener(listener: (event: MatchmakingFoundEvent) => void): Subscription;
//# sourceMappingURL=index.d.ts.map