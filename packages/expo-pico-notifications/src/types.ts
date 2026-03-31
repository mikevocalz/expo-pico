export type NotificationPermissionStatus = 'granted' | 'denied' | 'not-determined';

export interface NotificationPermissionResult {
  status: NotificationPermissionStatus;
  /** True if this call triggered the OS permission dialog for the first time */
  prompted: boolean;
}

export interface NotificationToken {
  token: string;
  /** FCM for standard Android push, 'pico' for PICO-specific push routing */
  provider: 'fcm' | 'pico';
  registeredAtMs: number;
}
