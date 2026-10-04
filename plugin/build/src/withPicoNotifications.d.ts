import { ConfigPlugin } from '@expo/config-plugins';
export interface PicoNotificationsPluginOptions {
    /**
     * Android notification permission (required on API 33+).
     * @default true
     */
    requestPostNotificationsPermission?: boolean;
}
declare const withPicoNotifications: ConfigPlugin<PicoNotificationsPluginOptions | void>;
export default withPicoNotifications;
//# sourceMappingURL=withPicoNotifications.d.ts.map