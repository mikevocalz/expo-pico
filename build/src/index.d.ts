import { type Subscription } from '@expo-pico/platform-service-common';
import type { NotificationPermissionStatus, PicoPushMessage, PicoPushRevocation } from './types';
export type { NotificationPermissionStatus, NotificationPermissionResult, NotificationProvider, NotificationToken, PicoPushMessage, PicoPushRevocation, } from './types';
export declare function isNotificationsAvailable(): boolean;
export declare function getNotificationsSdkVersion(): string;
export declare function getNotificationPermissionStatus(): NotificationPermissionStatus;
export declare function requestPermissions(): Promise<import("./types").NotificationPermissionResult>;
export declare function registerForPushNotifications(): Promise<import("./types").NotificationToken>;
export declare function unregisterForPushNotifications(): Promise<void>;
/**
 * Fires for each incoming push. Registration alone only obtains a token — an
 * app with no listener can be addressed but never hears anything.
 */
export declare function addPushMessageListener(listener: (message: PicoPushMessage) => void): Subscription;
/** Fires when the server revokes a previously delivered push. */
export declare function addPushRevocationListener(listener: (revocation: PicoPushRevocation) => void): Subscription;
//# sourceMappingURL=index.d.ts.map