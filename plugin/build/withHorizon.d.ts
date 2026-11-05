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
     * Minimum Meta VR OS SDK version for the Quest build, independent of Android's API level.
     * Omitted by default so existing apps keep their OS compatibility.
     * Older OS releases may ignore the declaration; also guard newer APIs at runtime.
     * @see https://developers.meta.com/vr/documentation/android-apps/metavr-os-sdk-versioning/
     */
    horizonMinSdkVersion?: number;
    /**
     * Meta VR OS SDK behavior version targeted by the Quest build.
     * Must be at least horizonMinSdkVersion when both are set. Omitted by default.
     * @see https://developers.meta.com/vr/documentation/android-apps/metavr-os-sdk-versioning/
     */
    horizonTargetSdkVersion?: number;
    /**
     * Default panel height in dp.
     * @example "640dp"
     * @see https://developers.meta.com/vr/essentials/horizon-os-panel-sizing/
     */
    defaultHeight?: string;
    /**
     * Default panel width in dp.
     * @example "1024dp"
     * @see https://developers.meta.com/vr/essentials/horizon-os-panel-sizing/
     */
    defaultWidth?: string;
    /**
     * Minimum panel width in dp for the Quest build. Omitted by default.
     * Must be a positive dp dimension.
     * @example "600dp"
     */
    minWidth?: string;
    /**
     * Minimum panel height in dp for the Quest build. Omitted by default.
     * Must be a positive dp dimension.
     * @example "400dp"
     */
    minHeight?: string;
    /**
     * Required pipe-separated list of supported Quest devices.
     * @example "quest2|quest3|quest3s"
     * @see https://developers.meta.com/horizon/resources/publish-mobile-manifest/
     */
    supportedDevices: string;
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
