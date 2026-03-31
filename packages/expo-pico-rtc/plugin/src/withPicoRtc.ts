import { ConfigPlugin, AndroidConfig } from '@expo/config-plugins';

const { withPermissions } = AndroidConfig.Permissions;

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
const withPicoRtc: ConfigPlugin<PicoRtcPluginOptions | void> = (config, rawOptions) => {
  const options = { microphonePermission: true, ...(rawOptions ?? {}) };

  if (options.microphonePermission) {
    config = withPermissions(config, ['android.permission.RECORD_AUDIO']);
  }

  return config;
};

export default withPicoRtc;
