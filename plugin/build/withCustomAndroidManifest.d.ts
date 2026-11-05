import { ConfigPlugin } from '@expo/config-plugins';
import type { HorizonOptions } from './withHorizon';
/**
 * Creates a separate AndroidManifest.xml for the Horizon flavor.
 * This plugin uses withDangerousMod to directly manipulate files and
 * modifies the app build.gradle to add flavor dimensions.
 */
export declare const withCustomAndroidManifest: ConfigPlugin<HorizonOptions>;
export default withCustomAndroidManifest;
