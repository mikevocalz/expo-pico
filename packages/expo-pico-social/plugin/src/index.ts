import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

const SOCIAL_PERMISSION = 'com.picovr.platform.permission.SOCIAL';

export interface PicoSocialPluginOptions {
  enabled?: boolean;
}

const withPicoSocial: ConfigPlugin<PicoSocialPluginOptions | void> = (
  config,
  options
) => {
  const { enabled = true } = options ?? {};
  if (!enabled) return config;

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (!manifest['uses-permission']) manifest['uses-permission'] = [];

    const exists = manifest['uses-permission'].some(
      (p: any) => p.$?.['android:name'] === SOCIAL_PERMISSION
    );
    if (!exists) {
      manifest['uses-permission'].push({ $: { 'android:name': SOCIAL_PERMISSION } });
    }

    return cfg;
  });

  return config;
};

export default withPicoSocial;
