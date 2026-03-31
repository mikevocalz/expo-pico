import { NativeModule } from 'expo';
import { resolveNativeModule } from '@expo-pico/platform-service-common';

declare class ExpoPicoSocialModule extends NativeModule {
  readonly socialSdkAvailable: boolean;
  readonly socialSdkVersion: string;

  getCurrentUser(): Promise<Record<string, unknown>>;
  getFriendList(pageToken: string | null, pageSize: number): Promise<Record<string, unknown>>;
  getFriendshipStatus(userId: string): Promise<string>;
  sendFriendRequest(userId: string): Promise<Record<string, unknown>>;
  acceptFriendRequest(requestId: string): Promise<void>;
  declineFriendRequest(requestId: string): Promise<void>;
  removeFriend(userId: string): Promise<void>;
  blockUser(userId: string): Promise<void>;
  unblockUser(userId: string): Promise<void>;
  setPresence(status: string, richText: string | null, destinationApiName: string | null): Promise<void>;
  clearPresence(): Promise<void>;
  sendInvites(destinationApiName: string, userIds: string[], data: Record<string, string>): Promise<Record<string, unknown>[]>;
  getPendingFriendRequests(): Promise<Record<string, unknown>[]>;
}

const { available, nativeModule } = resolveNativeModule<ExpoPicoSocialModule>('ExpoPicoSocial');

export const NativeSocial = available ? nativeModule : null;
export const socialNativeAvailable = available;
export default NativeSocial;
