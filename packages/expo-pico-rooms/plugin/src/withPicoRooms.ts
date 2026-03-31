import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

/**
 * Config plugin for expo-pico-rooms.
 *
 * Declares the PICO social/platform permission needed for room and
 * matchmaking APIs. Does NOT inject flavors or Maven repos — core owns those.
 *
 * No config options needed — the permission is always required when using rooms.
 */
const withPicoRooms: ConfigPlugin<void> = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest['uses-permission']) manifest['uses-permission'] = [];

    const PICO_SOCIAL_PERMISSION = 'com.picovr.platform.permission.SOCIAL';
    const exists = manifest['uses-permission'].some(
      (p: any) => p.$?.['android:name'] === PICO_SOCIAL_PERMISSION
    );

    if (!exists) {
      manifest['uses-permission'].push({
        $: { 'android:name': PICO_SOCIAL_PERMISSION },
      } as any);
    }

    return config;
  });
};

export default withPicoRooms;
