import {
  guardService,
  wrapNativeCall,
  notImplementedError,
} from '@expo-pico/platform-service-common';
import { NativeNotifications } from './ExpoPicoNotificationsModule';
import type {
  NotificationPermissionStatus,
  NotificationPermissionResult,
  NotificationToken,
} from './types';

export * from './types';

const PKG = 'expo-pico-notifications';
const DOCS = 'https://developer.picoxr.com/document/unity/push-notification/';

// ─── Availability ─────────────────────────────────────────────────────────────

export function isNotificationsAvailable(): boolean {
  return NativeNotifications?.notificationsSdkAvailable ?? false;
}

export function getNotificationsSdkVersion(): string {
  return NativeNotifications?.notificationsSdkVersion ?? 'unavailable';
}

// ─── Permission status (sync — reads cached native constant) ──────────────────

export function getNotificationPermissionStatus(): NotificationPermissionStatus {
  if (!NativeNotifications) return 'not-determined';
  return NativeNotifications.getPermissionStatus() as NotificationPermissionStatus;
}

// ─── Implemented ──────────────────────────────────────────────────────────────

export async function requestPermissions(): Promise<NotificationPermissionResult> {
  guardService(isNotificationsAvailable(), PKG, 'requestPermissions');
  const raw = await wrapNativeCall(
    PKG, 'requestPermissions',
    NativeNotifications!.requestPermissions()
  );
  return raw as unknown as NotificationPermissionResult;
}

// ─── Seam ─────────────────────────────────────────────────────────────────────

/**
 * @seam Push token registration requires FCM/PICO backend integration.
 * Wire when backend push infrastructure is configured.
 */
export async function registerForPushNotifications(): Promise<NotificationToken> {
  throw notImplementedError(PKG, 'registerForPushNotifications', DOCS);
}
