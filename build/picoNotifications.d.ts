export type NotificationPermissionStatus = 'granted' | 'denied' | 'not-determined';
export type Subscription = {
    remove: () => void;
};
export declare function getPermissionStatus(): NotificationPermissionStatus;
export declare function requestPermissions(): Promise<NotificationPermissionStatus>;
export declare function registerForPush(): Promise<string | null>;
export declare function onNotificationReceived(cb: (payload: unknown) => void): Subscription;
export declare function onNotificationOpened(cb: (payload: unknown) => void): Subscription;
export declare function useNotificationPermission(): {
    status: NotificationPermissionStatus;
    request: () => Promise<NotificationPermissionStatus>;
};
export declare function usePushToken(): string | null;
export declare function useIncomingNotification(): unknown | null;
export declare const picoNotifications: {
    getPermissionStatus: typeof getPermissionStatus;
    requestPermissions: typeof requestPermissions;
    registerForPush: typeof registerForPush;
    onNotificationReceived: typeof onNotificationReceived;
    onNotificationOpened: typeof onNotificationOpened;
    isAvailable: () => boolean;
};
//# sourceMappingURL=picoNotifications.d.ts.map