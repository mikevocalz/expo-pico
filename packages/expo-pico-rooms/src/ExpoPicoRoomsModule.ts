import { NativeModule } from 'expo';
import { resolveNativeModule } from '@expo-pico/platform-service-common';

declare class ExpoPicoRoomsModule extends NativeModule {
  readonly roomsSdkAvailable: boolean;
  readonly roomsSdkVersion: string;

  // Async methods — bridge to native AsyncFunction
  createRoom(joinPolicy: string, maxMembers: number, data: Record<string, string>): Promise<Record<string, unknown>>;
  joinRoom(roomId: string): Promise<Record<string, unknown>>;
  leaveRoom(): Promise<void>;
  getRoomInfo(roomId: string): Promise<Record<string, unknown>>;
  kickUser(userId: string): Promise<void>;
  updateRoomData(data: Record<string, string>): Promise<void>;

  // Sync — reads atomically cached state from native
  getRoomSessionState(): Record<string, unknown>;
}

const { available, nativeModule } = resolveNativeModule<ExpoPicoRoomsModule>('ExpoPicoRooms');

export const NativeRooms = available ? nativeModule : null;
export const roomsNativeAvailable = available;
