import {
  guardService,
  wrapNativeCall,
  safeAddListener,
  createNativeEventEmitter,
  type Subscription,
} from '@expo-pico/platform-service-common';
import { NativeSocial } from './ExpoPicoSocialModule';
import type {
  FriendListResult,
  FriendRequest,
  FriendshipStatus,
  InviteOptions,
  PresenceOptions,
  SocialUser,
  SentInvite,
  FriendPresenceChangedEvent,
  FriendRequestReceivedEvent,
  InviteReceivedEvent,
} from './types';

export * from './types';
export type { Subscription };

const PKG = '@expo-pico/social';
const emitter = createNativeEventEmitter(NativeSocial);

// ─── Availability ─────────────────────────────────────────────────────────────

export function isSocialAvailable(): boolean {
  return NativeSocial?.socialSdkAvailable ?? false;
}

export function getSocialSdkVersion(): string {
  return NativeSocial?.socialSdkVersion ?? 'unavailable';
}

// ─── Current user ─────────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<SocialUser> {
  guardService(isSocialAvailable(), PKG, 'getCurrentUser');
  const raw = await wrapNativeCall(PKG, 'getCurrentUser', NativeSocial!.getCurrentUser());
  return raw as unknown as SocialUser;
}

// ─── Friends ──────────────────────────────────────────────────────────────────

export async function getFriendList(
  pageToken?: string,
  pageSize?: number
): Promise<FriendListResult> {
  guardService(isSocialAvailable(), PKG, 'getFriendList');
  const raw = await wrapNativeCall(
    PKG, 'getFriendList',
    NativeSocial!.getFriendList(pageToken ?? null, pageSize ?? 20)
  );
  return raw as unknown as FriendListResult;
}

export async function getFriendshipStatus(userId: string): Promise<FriendshipStatus> {
  guardService(isSocialAvailable(), PKG, 'getFriendshipStatus');
  const raw = await wrapNativeCall(
    PKG, 'getFriendshipStatus',
    NativeSocial!.getFriendshipStatus(userId)
  );
  return raw as unknown as FriendshipStatus;
}

export async function sendFriendRequest(userId: string): Promise<FriendRequest> {
  guardService(isSocialAvailable(), PKG, 'sendFriendRequest');
  const raw = await wrapNativeCall(
    PKG, 'sendFriendRequest',
    NativeSocial!.sendFriendRequest(userId)
  );
  return raw as unknown as FriendRequest;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'acceptFriendRequest');
  await wrapNativeCall(PKG, 'acceptFriendRequest', NativeSocial!.acceptFriendRequest(requestId));
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'declineFriendRequest');
  await wrapNativeCall(PKG, 'declineFriendRequest', NativeSocial!.declineFriendRequest(requestId));
}

export async function removeFriend(userId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'removeFriend');
  await wrapNativeCall(PKG, 'removeFriend', NativeSocial!.removeFriend(userId));
}

export async function blockUser(userId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'blockUser');
  await wrapNativeCall(PKG, 'blockUser', NativeSocial!.blockUser(userId));
}

export async function unblockUser(userId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'unblockUser');
  await wrapNativeCall(PKG, 'unblockUser', NativeSocial!.unblockUser(userId));
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export async function setPresence(options: PresenceOptions): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'setPresence');
  await wrapNativeCall(
    PKG, 'setPresence',
    NativeSocial!.setPresence(
      options.status,
      options.richText ?? null,
      options.destinationApiName ?? null
    )
  );
}

export async function clearPresence(): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'clearPresence');
  await wrapNativeCall(PKG, 'clearPresence', NativeSocial!.clearPresence());
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export async function sendInvites(options: InviteOptions): Promise<SentInvite[]> {
  guardService(isSocialAvailable(), PKG, 'sendInvites');
  const raw = await wrapNativeCall(
    PKG, 'sendInvites',
    NativeSocial!.sendInvites(
      options.destinationApiName,
      options.userIds,
      options.data ?? {}
    )
  );
  return raw as unknown as SentInvite[];
}

export async function getPendingFriendRequests(): Promise<FriendRequest[]> {
  guardService(isSocialAvailable(), PKG, 'getPendingFriendRequests');
  const raw = await wrapNativeCall(
    PKG, 'getPendingFriendRequests',
    NativeSocial!.getPendingFriendRequests()
  );
  return raw as unknown as FriendRequest[];
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

export function addFriendPresenceChangedListener(
  listener: (event: FriendPresenceChangedEvent) => void
): Subscription {
  return safeAddListener<FriendPresenceChangedEvent>(emitter, 'onFriendPresenceChanged', listener);
}

export function addFriendRequestReceivedListener(
  listener: (event: FriendRequestReceivedEvent) => void
): Subscription {
  return safeAddListener<FriendRequestReceivedEvent>(emitter, 'onFriendRequestReceived', listener);
}

export function addInviteReceivedListener(
  listener: (event: InviteReceivedEvent) => void
): Subscription {
  return safeAddListener<InviteReceivedEvent>(emitter, 'onInviteReceived', listener);
}
