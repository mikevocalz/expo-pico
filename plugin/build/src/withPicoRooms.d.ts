import { ConfigPlugin } from '@expo/config-plugins';
export declare const PICO_SOCIAL_PERMISSION = "com.picovr.platform.permission.SOCIAL";
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
declare const withPicoRooms: ConfigPlugin<void>;
export default withPicoRooms;
//# sourceMappingURL=withPicoRooms.d.ts.map