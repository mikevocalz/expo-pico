import { ConfigPlugin } from '@expo/config-plugins';
type HorizonManifestOptions = {
    horizonAppId?: string;
    defaultHeight?: string;
    defaultWidth?: string;
    supportedDevices?: string;
    disableVrHeadtracking?: boolean;
    allowBackup?: boolean;
};
/**
 * Creates a separate AndroidManifest.xml for the Horizon flavor.
 * This plugin uses withDangerousMod to directly manipulate files and
 * modifies the app build.gradle to add flavor dimensions.
 */
export declare const withCustomAndroidManifest: ConfigPlugin<HorizonManifestOptions>;
export default withCustomAndroidManifest;
