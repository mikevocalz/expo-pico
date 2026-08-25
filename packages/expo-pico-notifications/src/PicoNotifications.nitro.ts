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

/** A push delivered by the PICO push service. `data` is the raw payload string. */
export interface PicoPushMessage {
  msgId: string;
  data: string;
}

/** A server-side revocation of a previously delivered push. */
export interface PicoPushRevocation {
  msgId: string;
  revokeId: string;
  revokeData: string;
}

export interface PicoNotifications extends HybridObject<{ android: 'kotlin' }> {
  readonly available: boolean;
  readonly sdkVersion: string;
  readonly permissionStatus: NotificationPermissionStatus;

  requestPermissions(): Promise<NotificationPermissionResult>;
  registerForPushNotifications(): Promise<NotificationToken>;
  /** Releases the push token. The device stops receiving pushes for this app. */
  unregisterForPushNotifications(): Promise<void>;

  /**
   * Delivery of an incoming push.
   *
   * Registration alone only yields a token — without a listener the app can be
   * addressed but never hears anything. PPS allows a single receiver, so the
   * first listener installs it and the last one removed uninstalls it.
   */
  addPushMessageListener(listener: (message: PicoPushMessage) => void): number;
  addPushRevocationListener(listener: (revocation: PicoPushRevocation) => void): number;
  removeListener(id: number): void;
}
