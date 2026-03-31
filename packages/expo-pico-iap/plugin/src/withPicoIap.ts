import {
  ConfigPlugin,
  withAndroidManifest,
} from '@expo/config-plugins';

const PICO_BILLING_PERMISSION = 'com.picovr.payment.BILLING';

/**
 * Config plugin for expo-pico-iap.
 *
 * Adds the PICO billing permission to AndroidManifest.xml.
 * Requires expo-pico-core to be listed first in the plugins array.
 */
const withPicoIap: ConfigPlugin<void> = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest['uses-permission']) manifest['uses-permission'] = [];

    const exists = manifest['uses-permission'].some(
      (p: any) => p.$?.['android:name'] === PICO_BILLING_PERMISSION
    );

    if (!exists) {
      manifest['uses-permission'].push({
        $: { 'android:name': PICO_BILLING_PERMISSION },
      } as any);
    }

    return config;
  });
};

export default withPicoIap;
