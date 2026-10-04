import { ConfigPlugin } from '@expo/config-plugins';
/**
 * Config plugin for expo-pico-rooms.
 *
 * Declares the PICO social/platform permission needed for room and
 * matchmaking APIs. Does NOT inject flavors or Maven repos — core owns those.
 *
 * No config options needed — the permission is always required when using rooms.
 */
declare const withPicoRooms: ConfigPlugin<void>;
export default withPicoRooms;
//# sourceMappingURL=withPicoRooms.d.ts.map