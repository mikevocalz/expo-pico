import { ConfigPlugin } from '@expo/config-plugins';
export declare const PICO_BILLING_PERMISSION = "com.picovr.payment.BILLING";
/**
 * Config plugin for expo-pico-subscription.
 *
 * Declares the PICO billing permission through core's flavor routing (pico
 * flavor manifest when one exists, main manifest otherwise). Safe to use
 * alongside expo-pico-iap: both record the same permission and it is
 * written once.
 *
 * Does NOT inject flavors or Maven repos — core owns those.
 */
declare const withPicoSubscription: ConfigPlugin<void>;
export default withPicoSubscription;
//# sourceMappingURL=withPicoSubscription.d.ts.map