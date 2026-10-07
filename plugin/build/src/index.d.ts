import { ConfigPlugin } from '@expo/config-plugins';
export declare const SOCIAL_PERMISSION = "com.picovr.platform.permission.SOCIAL";
export interface PicoSocialPluginOptions {
    enabled?: boolean;
}
/**
 * Declares the PICO social permission, routed by core to the pico flavor
 * manifest when one exists (main manifest otherwise).
 */
declare const withPicoSocial: ConfigPlugin<PicoSocialPluginOptions | void>;
export default withPicoSocial;
//# sourceMappingURL=index.d.ts.map