import {
  guardService,
  wrapNativeCall,
  resolveHybridObject,
  NULL_SUBSCRIPTION,
  type Subscription,
} from '@expo-pico/platform-service-common';
import type {
  PicoSocial,
  PresenceOptions,
  InviteOptions,
  FriendRequest,
  FriendPresenceChangedEvent,
  InviteReceivedEvent,
} from './PicoSocial.nitro';

export type {
  FriendshipStatus,
  PresenceStatus,
  SocialUser,
  FriendRequest,
  FriendListResult,
  SentInvite,
  InviteOptions,
  PresenceOptions,
  FriendPresenceChangedEvent,
  InviteReceivedEvent,
} from './PicoSocial.nitro';

const PKG = '@expo-pico/social';

function native(): PicoSocial | null {
  return resolveHybridObject<PicoSocial>('PicoSocial');
}

export function isSocialAvailable(): boolean {
  return native()?.available ?? false;
}

export function getSocialSdkVersion(): string {
  return native()?.sdkVersion ?? 'unavailable';
}

export async function getCurrentUser() {
  guardService(isSocialAvailable(), PKG, 'getCurrentUser');
  return wrapNativeCall(PKG, 'getCurrentUser', native()!.getCurrentUser());
}

export async function getFriendList(pageSize?: number, pageToken?: string) {
  guardService(isSocialAvailable(), PKG, 'getFriendList');
  return wrapNativeCall(PKG, 'getFriendList', native()!.getFriendList(pageSize, pageToken));
}

export async function getFriendshipStatus(userId: string) {
  guardService(isSocialAvailable(), PKG, 'getFriendshipStatus');
  return wrapNativeCall(PKG, 'getFriendshipStatus', native()!.getFriendshipStatus(userId));
}

export async function sendFriendRequest(userId: string) {
  guardService(isSocialAvailable(), PKG, 'sendFriendRequest');
  return wrapNativeCall(PKG, 'sendFriendRequest', native()!.sendFriendRequest(userId));
}

export async function getPendingFriendRequests() {
  guardService(isSocialAvailable(), PKG, 'getPendingFriendRequests');
  return wrapNativeCall(PKG, 'getPendingFriendRequests', native()!.getPendingFriendRequests());
}

// Removed in PPS 1.0.x — kept as typed seams that reject with NOT_IN_PPS_1_0.

export async function acceptFriendRequest(requestId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'acceptFriendRequest');
  await wrapNativeCall(PKG, 'acceptFriendRequest', native()!.acceptFriendRequest(requestId));
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'declineFriendRequest');
  await wrapNativeCall(PKG, 'declineFriendRequest', native()!.declineFriendRequest(requestId));
}

export async function removeFriend(userId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'removeFriend');
  await wrapNativeCall(PKG, 'removeFriend', native()!.removeFriend(userId));
}

export async function blockUser(userId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'blockUser');
  await wrapNativeCall(PKG, 'blockUser', native()!.blockUser(userId));
}

export async function unblockUser(userId: string): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'unblockUser');
  await wrapNativeCall(PKG, 'unblockUser', native()!.unblockUser(userId));
}

export async function setPresence(options: PresenceOptions): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'setPresence');
  await wrapNativeCall(PKG, 'setPresence', native()!.setPresence(options));
}

export async function clearPresence(): Promise<void> {
  guardService(isSocialAvailable(), PKG, 'clearPresence');
  await wrapNativeCall(PKG, 'clearPresence', native()!.clearPresence());
}

export async function sendInvites(options: InviteOptions) {
  guardService(isSocialAvailable(), PKG, 'sendInvites');
  return wrapNativeCall(PKG, 'sendInvites', native()!.sendInvites(options));
}

function subscribe(register: (h: PicoSocial) => number): Subscription {
  const hybrid = native();
  if (!hybrid?.available) return NULL_SUBSCRIPTION;
  const id = register(hybrid);
  return { remove: () => hybrid.removeListener(id) };
}

export function addFriendPresenceChangedListener(
  listener: (event: FriendPresenceChangedEvent) => void
): Subscription {
  return subscribe((h) => h.addFriendPresenceChangedListener(listener));
}

export function addFriendRequestReceivedListener(
  listener: (request: FriendRequest) => void
): Subscription {
  return subscribe((h) => h.addFriendRequestReceivedListener(listener));
}

export function addInviteReceivedListener(
  listener: (event: InviteReceivedEvent) => void
): Subscription {
  return subscribe((h) => h.addInviteReceivedListener(listener));
}
