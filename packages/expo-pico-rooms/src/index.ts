import {
  guardService,
  wrapNativeCall,
  resolveHybridObject,
  NULL_SUBSCRIPTION,
  type Subscription,
} from '@expo-pico/platform-service-common';
import type {
  PicoRooms,
  RoomSessionState,
  CreateRoomOptions,
  MatchmakingOptions,
  RoomUpdatedEvent,
  RoomUserJoinedEvent,
  RoomUserLeftEvent,
  MatchmakingFoundEvent,
} from './PicoRooms.nitro';

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
} from './PicoRooms.nitro';

const PKG = '@expo-pico/rooms';

const DISCONNECTED: RoomSessionState = {
  memberCount: 0,
  connectionState: 'disconnected',
};

function native(): PicoRooms | null {
  return resolveHybridObject<PicoRooms>('PicoRooms');
}

export function isRoomsAvailable(): boolean {
  return native()?.available ?? false;
}

export function getRoomsSdkVersion(): string {
  return native()?.sdkVersion ?? 'unavailable';
}

export function getRoomSessionState(): RoomSessionState {
  return native()?.sessionState ?? DISCONNECTED;
}

export async function createRoom(options?: CreateRoomOptions) {
  guardService(isRoomsAvailable(), PKG, 'createRoom');
  return wrapNativeCall(PKG, 'createRoom', native()!.createRoom(options));
}

export async function joinRoom(roomId: string) {
  guardService(isRoomsAvailable(), PKG, 'joinRoom');
  return wrapNativeCall(PKG, 'joinRoom', native()!.joinRoom(roomId));
}

export async function leaveRoom(): Promise<void> {
  guardService(isRoomsAvailable(), PKG, 'leaveRoom');
  await wrapNativeCall(PKG, 'leaveRoom', native()!.leaveRoom());
}

export async function getRoomInfo(roomId: string) {
  guardService(isRoomsAvailable(), PKG, 'getRoomInfo');
  return wrapNativeCall(PKG, 'getRoomInfo', native()!.getRoomInfo(roomId));
}

export async function kickUser(userId: string): Promise<void> {
  guardService(isRoomsAvailable(), PKG, 'kickUser');
  await wrapNativeCall(PKG, 'kickUser', native()!.kickUser(userId));
}

export async function updateRoomData(data: Record<string, string>): Promise<void> {
  guardService(isRoomsAvailable(), PKG, 'updateRoomData');
  await wrapNativeCall(PKG, 'updateRoomData', native()!.updateRoomData(data));
}

export async function requestMatchmaking(options: MatchmakingOptions): Promise<void> {
  guardService(isRoomsAvailable(), PKG, 'requestMatchmaking');
  await wrapNativeCall(PKG, 'requestMatchmaking', native()!.requestMatchmaking(options));
}

export async function cancelMatchmaking(): Promise<void> {
  guardService(isRoomsAvailable(), PKG, 'cancelMatchmaking');
  await wrapNativeCall(PKG, 'cancelMatchmaking', native()!.cancelMatchmaking());
}

function subscribe(register: (h: PicoRooms) => number): Subscription {
  const hybrid = native();
  if (!hybrid?.available) return NULL_SUBSCRIPTION;
  const id = register(hybrid);
  return { remove: () => hybrid.removeListener(id) };
}

export function addRoomUpdatedListener(listener: (event: RoomUpdatedEvent) => void): Subscription {
  return subscribe((h) => h.addRoomUpdatedListener(listener));
}

export function addRoomUserJoinedListener(
  listener: (event: RoomUserJoinedEvent) => void
): Subscription {
  return subscribe((h) => h.addRoomUserJoinedListener(listener));
}

export function addRoomUserLeftListener(
  listener: (event: RoomUserLeftEvent) => void
): Subscription {
  return subscribe((h) => h.addRoomUserLeftListener(listener));
}

export function addMatchmakingFoundListener(
  listener: (event: MatchmakingFoundEvent) => void
): Subscription {
  return subscribe((h) => h.addMatchmakingFoundListener(listener));
}
