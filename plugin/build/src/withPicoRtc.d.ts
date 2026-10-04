import { ConfigPlugin } from '@expo/config-plugins';
export interface PicoRtcPluginOptions {
    /**
     * Request RECORD_AUDIO permission for voice channels.
     * Should almost always be true unless you only receive audio.
     * @default true
     */
    microphonePermission?: boolean;
}
/**
 * Config plugin for expo-pico-rtc.
 *
 * The library AndroidManifest.xml already declares RECORD_AUDIO,
 * MODIFY_AUDIO_SETTINGS, and BLUETOOTH_CONNECT via the AAR merge.
 * This plugin adds RECORD_AUDIO to the app's own manifest via
 * withPermissions so it appears in the merged output for all build variants,
 * not just the pico flavor.
 *
 * Does NOT inject Gradle flavors or Maven repos — core owns those.
 */
declare const withPicoRtc: ConfigPlugin<PicoRtcPluginOptions | void>;
export default withPicoRtc;
//# sourceMappingURL=withPicoRtc.d.ts.map