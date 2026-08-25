import type { HybridObject } from 'react-native-nitro-modules';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'not-determined';
export type NotificationProvider = 'fcm' | 'pico';

export interface NotificationPermissionResult {
  status: NotificationPermissionStatus;
  /** True when this call raised the OS dialog for the first time. */
  prompted: boolean;
}

export interface NotificationToken {
  token: string;
  provider: NotificationProvider;
  registeredAtMs: number;
}

export interface PicoNotifications extends HybridObject<{ android: 'kotlin' }> {
  readonly available: boolean;
  readonly sdkVersion: string;
  readonly permissionStatus: NotificationPermissionStatus;

  requestPermissions(): Promise<NotificationPermissionResult>;
  registerForPushNotifications(): Promise<NotificationToken>;
}
