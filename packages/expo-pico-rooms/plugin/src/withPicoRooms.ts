import { ConfigPlugin } from '@expo/config-plugins';
import { withPicoFlavorPermission } from '@expo-pico/core/plugin';

export const PICO_SOCIAL_PERMISSION = 'com.picovr.platform.permission.SOCIAL';

/**
 * Config plugin for expo-pico-rooms.
 *
 * Declares the PICO social/platform permission needed for room and
 * matchmaking APIs, routed by core to the pico flavor manifest when one
 * exists (main manifest otherwise). Does NOT inject flavors or Maven repos —
 * core owns those.
 *
 * No config options needed — the permission is always required when using rooms.
 */
const withPicoRooms: ConfigPlugin<void> = (config) =>
  withPicoFlavorPermission(config, PICO_SOCIAL_PERMISSION);

export default withPicoRooms;
