import {
  guardService,
  wrapNativeCall,
} from '@expo-pico/platform-service-common';
import { NativeNotifications } from './ExpoPicoNotificationsModule';
import type {
  NotificationPermissionStatus,
  NotificationPermissionResult,
  NotificationToken,
} from './types';

export * from './types';

const PKG = '@expo-pico/notifications';

export function isNotificationsAvailable(): boolean {
  return NativeNotifications?.notificationsSdkAvailable ?? false;
}

export function getNotificationsSdkVersion(): string {
  return NativeNotifications?.notificationsSdkVersion ?? 'unavailable';
}

export function getNotificationPermissionStatus(): NotificationPermissionStatus {
  if (!NativeNotifications) return 'not-determined';
  return NativeNotifications.getPermissionStatus() as NotificationPermissionStatus;
}

export async function requestPermissions(): Promise<NotificationPermissionResult> {
  guardService(isNotificationsAvailable(), PKG, 'requestPermissions');
  const raw = await wrapNativeCall(
    PKG, 'requestPermissions',
    NativeNotifications!.requestPermissions()
  );
  return raw as unknown as NotificationPermissionResult;
}

export async function registerForPushNotifications(): Promise<NotificationToken> {
  guardService(isNotificationsAvailable(), PKG, 'registerForPushNotifications');
  const raw = await wrapNativeCall(
    PKG, 'registerForPushNotifications',
    NativeNotifications!.registerForPushNotifications()
  );
  return raw as unknown as NotificationToken;
}
