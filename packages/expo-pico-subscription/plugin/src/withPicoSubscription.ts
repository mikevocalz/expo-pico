import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

const PICO_BILLING_PERMISSION = 'com.picovr.payment.BILLING';

/**
 * Config plugin for expo-pico-subscription.
 *
 * Adds the PICO billing permission. Idempotent — safe to use alongside
 * expo-pico-iap (both declare the same permission; Android manifest merger
 * deduplicates automatically, and the guard check prevents double-push
 * into the config plugin output array).
 *
 * Does NOT inject flavors or Maven repos — core owns those.
 */
const withPicoSubscription: ConfigPlugin<void> = (config) => {
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

export default withPicoSubscription;
