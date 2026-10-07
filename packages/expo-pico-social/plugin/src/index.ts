import { ConfigPlugin } from '@expo/config-plugins';
import { withPicoFlavorPermission } from '@expo-pico/core/plugin';

export const SOCIAL_PERMISSION = 'com.picovr.platform.permission.SOCIAL';

export interface PicoSocialPluginOptions {
  enabled?: boolean;
}

/**
 * Declares the PICO social permission, routed by core to the pico flavor
 * manifest when one exists (main manifest otherwise).
 */
const withPicoSocial: ConfigPlugin<PicoSocialPluginOptions | void> = (config, options) => {
  const { enabled = true } = options ?? {};
  if (!enabled) return config;
  return withPicoFlavorPermission(config, SOCIAL_PERMISSION);
};

export default withPicoSocial;
