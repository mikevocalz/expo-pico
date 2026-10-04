import { ConfigPlugin } from '@expo/config-plugins';
export type HorizonOptions = {
    /**
     * Your Meta Horizon application ID.
     * Used by other libraries (like expo-horizon-notifications) to identify your app.
     * @default ""
     * @see https://developers.meta.com/horizon/resources/publish-overview-appID/#creating-an-app-id
     */
    horizonAppId?: string;
    /**
     * Default panel height in dp.
     * @example "640dp"
     * @see https://developers.meta.com/horizon/documentation/android-apps/panel-sizing
     */
    defaultHeight?: string;
    /**
     * Default panel width in dp.
     * @example "1024dp"
     * @see https://developers.meta.com/horizon/documentation/android-apps/panel-sizing
     */
    defaultWidth?: string;
    /**
     * Pipe-separated list of supported Quest devices.
     * @example "quest2|quest3|quest3s"
     * @see https://developers.meta.com/horizon/resources/publish-mobile-manifest/
     */
    supportedDevices?: string;
    /**
     * Set to `true` to disable VR headtracking feature.
     * By default, adds `android.hardware.vr.headtracking` to the Android Manifest.
     */
    disableVrHeadtracking?: boolean;
    /**
     * Set to true in the Quest build to enable Android's allowBackup feature.
     * The default value is false which removes the "allowBackup=true" warning in the Meta Horizon Store.
     * This does not affect your mobile build variant.
     */
    allowBackup?: boolean;
};
declare const withHorizon: ConfigPlugin<HorizonOptions>;
export default withHorizon;
