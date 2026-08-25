import {
  guardService,
  wrapNativeCall,
  NULL_SUBSCRIPTION,
  type Subscription,
  resolveHybridObject,
} from '@expo-pico/platform-service-common';
import type {
  PicoNotifications,
  NotificationPermissionStatus,
  PicoPushMessage,
  PicoPushRevocation,
} from './PicoNotifications.nitro';

export type {
  NotificationPermissionStatus,
  NotificationPermissionResult,
  NotificationProvider,
  NotificationToken,
  PicoPushMessage,
  PicoPushRevocation,
} from './PicoNotifications.nitro';

const PKG = '@expo-pico/notifications';

function native(): PicoNotifications | null {
  return resolveHybridObject<PicoNotifications>('PicoNotifications');
}

export function isNotificationsAvailable(): boolean {
  return native()?.available ?? false;
}

export function getNotificationsSdkVersion(): string {
  return native()?.sdkVersion ?? 'unavailable';
}

export function getNotificationPermissionStatus(): NotificationPermissionStatus {
  return native()?.permissionStatus ?? 'not-determined';
}

export async function requestPermissions() {
  guardService(isNotificationsAvailable(), PKG, 'requestPermissions');
  return wrapNativeCall(PKG, 'requestPermissions', native()!.requestPermissions());
}

export async function registerForPushNotifications() {
  guardService(isNotificationsAvailable(), PKG, 'registerForPushNotifications');
  return wrapNativeCall(
    PKG,
    'registerForPushNotifications',
    native()!.registerForPushNotifications()
  );
}

export async function unregisterForPushNotifications(): Promise<void> {
  guardService(isNotificationsAvailable(), PKG, 'unregisterForPushNotifications');
  await wrapNativeCall(
    PKG,
    'unregisterForPushNotifications',
    native()!.unregisterForPushNotifications()
  );
}

function subscribe(register: (h: PicoNotifications) => number): Subscription {
  const hybrid = native();
  if (!hybrid?.available) return NULL_SUBSCRIPTION;
  const id = register(hybrid);
  return { remove: () => hybrid.removeListener(id) };
}

/**
 * Fires for each incoming push. Registration alone only obtains a token — an
 * app with no listener can be addressed but never hears anything.
 */
export function addPushMessageListener(listener: (message: PicoPushMessage) => void): Subscription {
  return subscribe((h) => h.addPushMessageListener(listener));
}

/** Fires when the server revokes a previously delivered push. */
export function addPushRevocationListener(
  listener: (revocation: PicoPushRevocation) => void
): Subscription {
  return subscribe((h) => h.addPushRevocationListener(listener));
}
