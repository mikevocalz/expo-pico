import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

export interface PicoStoragePluginOptions {
  enabled?: boolean;
}

const withPicoStorage: ConfigPlugin<PicoStoragePluginOptions | void> = (
  config,
  options
) => {
  const { enabled = true } = options ?? {};
  if (!enabled) return config;

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (!manifest['uses-permission']) manifest['uses-permission'] = [];

    // INTERNET is already declared but ensure it's present
    const hasInternet = manifest['uses-permission'].some(
      (p: any) => p.$?.['android:name'] === 'android.permission.INTERNET'
    );
    if (!hasInternet) {
      manifest['uses-permission'].push({
        $: { 'android:name': 'android.permission.INTERNET' },
      });
    }

    return cfg;
  });

  return config;
};

export default withPicoStorage;
