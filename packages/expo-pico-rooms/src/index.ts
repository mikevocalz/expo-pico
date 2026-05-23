import {
  guardService,
  wrapNativeCall,
  notImplementedError,
  safeAddListener,
  createNativeEventEmitter,
  type Subscription,
} from '@expo-pico/platform-service-common';
import { NativeRooms } from './ExpoPicoRoomsModule';
import type {
  RoomInfo,
  RoomSessionState,
  CreateRoomOptions,
  JoinRoomResult,
  MatchmakingOptions,
  RoomUpdatedEvent,
  RoomUserJoinedEvent,
  RoomUserLeftEvent,
  MatchmakingFoundEvent,
} from './types';

export * from './types';
export type { Subscription };

const PKG = '@expo-pico/rooms';
const DOCS = 'https://developer.picoxr.com/document/unity/room-matchmaking/';

const emitter = createNativeEventEmitter(NativeRooms);

// ─── Availability ─────────────────────────────────────────────────────────────

export function isRoomsAvailable(): boolean {
  return NativeRooms?.roomsSdkAvailable ?? false;
}

export function getRoomsSdkVersion(): string {
  return NativeRooms?.roomsSdkVersion ?? 'unavailable';
}

// ─── Session state snapshot (sync) ────────────────────────────────────────────

export function getRoomSessionState(): RoomSessionState {
  if (!NativeRooms) {
    return { roomId: null, memberCount: 0, connectionState: 'disconnected', role: null };
  }
  return NativeRooms.getRoomSessionState() as unknown as RoomSessionState;
}

// ─── Room lifecycle ───────────────────────────────────────────────────────────

export async function createRoom(options?: CreateRoomOptions): Promise<RoomInfo> {
  guardService(isRoomsAvailable(), PKG, 'createRoom');
  const raw = await wrapNativeCall(
    PKG, 'createRoom',
    NativeRooms!.createRoom(
      options?.joinPolicy ?? 'everyone',
      options?.maxMembers ?? 16,
      options?.data ?? {}
    )
  );
  return raw as unknown as RoomInfo;
}

export async function joinRoom(roomId: string): Promise<JoinRoomResult> {
  guardService(isRoomsAvailable(), PKG, 'joinRoom');
  const raw = await wrapNativeCall(PKG, 'joinRoom', NativeRooms!.joinRoom(roomId));
  return raw as unknown as JoinRoomResult;
}

export async function leaveRoom(): Promise<void> {
  guardService(isRoomsAvailable(), PKG, 'leaveRoom');
  return wrapNativeCall(PKG, 'leaveRoom', NativeRooms!.leaveRoom());
}

export async function getRoomInfo(roomId: string): Promise<RoomInfo> {
  guardService(isRoomsAvailable(), PKG, 'getRoomInfo');
  const raw = await wrapNativeCall(PKG, 'getRoomInfo', NativeRooms!.getRoomInfo(roomId));
  return raw as unknown as RoomInfo;
}

export async function kickUser(userId: string): Promise<void> {
  guardService(isRoomsAvailable(), PKG, 'kickUser');
  return wrapNativeCall(PKG, 'kickUser', NativeRooms!.kickUser(userId));
}

export async function updateRoomData(data: Record<string, string>): Promise<void> {
  guardService(isRoomsAvailable(), PKG, 'updateRoomData');
  return wrapNativeCall(PKG, 'updateRoomData', NativeRooms!.updateRoomData(data));
}

// ─── Matchmaking (seam — SDK callback signature unstable across minor versions)

/**
 * @seam Matchmaking request is not yet implemented.
 * The PICO Platform SDK matchmaking callback interface varies between minor
 * SDK versions and is not yet stable enough to wire safely.
 * Wire through RoomsBridge.requestMatchmaking() when the SDK is linked.
 */
export async function requestMatchmaking(_options: MatchmakingOptions): Promise<void> {
  throw notImplementedError(PKG, 'requestMatchmaking', DOCS);
}

/**
 * @seam See requestMatchmaking() — same deferral reason.
 */
export async function cancelMatchmaking(): Promise<void> {
  throw notImplementedError(PKG, 'cancelMatchmaking', DOCS);
}

// ─── Event listeners ──────────────────────────────────────────────────────────

export function addRoomUpdatedListener(
  listener: (event: RoomUpdatedEvent) => void
): Subscription {
  return safeAddListener<RoomUpdatedEvent>(emitter, 'onRoomUpdated', listener);
}

export function addRoomUserJoinedListener(
  listener: (event: RoomUserJoinedEvent) => void
): Subscription {
  return safeAddListener<RoomUserJoinedEvent>(emitter, 'onRoomUserJoined', listener);
}

export function addRoomUserLeftListener(
  listener: (event: RoomUserLeftEvent) => void
): Subscription {
  return safeAddListener<RoomUserLeftEvent>(emitter, 'onRoomUserLeft', listener);
}

export function addMatchmakingFoundListener(
  listener: (event: MatchmakingFoundEvent) => void
): Subscription {
  return safeAddListener<MatchmakingFoundEvent>(emitter, 'onMatchmakingFound', listener);
}
