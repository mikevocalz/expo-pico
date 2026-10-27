import { type Subscription } from '@expo-pico/platform-service-common';
import { type NotificationPermissionStatus, type PicoPushMessage, type PicoPushRevocation } from './PicoNotifications.nitro';
export type { NotificationPermissionStatus, NotificationPermissionResult, NotificationProvider, NotificationToken, PicoPushMessage, PicoPushRevocation, } from './types';
export declare function isNotificationsAvailable(): boolean;
export declare function getNotificationsSdkVersion(): string;
export declare function getNotificationPermissionStatus(): NotificationPermissionStatus;
export declare function requestPermissions(): Promise<import("./PicoNotifications.nitro").NotificationPermissionResult>;
export declare function registerForPushNotifications(): Promise<import("./PicoNotifications.nitro").NotificationToken>;
export declare function unregisterForPushNotifications(): Promise<void>;
/**
 * Fires for each incoming push. Registration alone only obtains a token — an
 * app with no listener can be addressed but never hears anything.
 */
export declare function addPushMessageListener(listener: (message: PicoPushMessage) => void): Subscription;
/** Fires when the server revokes a previously delivered push. */
export declare function addPushRevocationListener(listener: (revocation: PicoPushRevocation) => void): Subscription;
//# sourceMappingURL=index.d.ts.map