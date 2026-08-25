import {
  guardService,
  wrapNativeCall,
  resolveHybridObject,
} from '@expo-pico/platform-service-common';
import type { PicoNotifications, NotificationPermissionStatus } from './PicoNotifications.nitro';

export type {
  NotificationPermissionStatus,
  NotificationPermissionResult,
  NotificationProvider,
  NotificationToken,
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
