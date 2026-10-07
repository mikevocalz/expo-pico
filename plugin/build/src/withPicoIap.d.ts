import { ConfigPlugin } from '@expo/config-plugins';
export declare const PICO_BILLING_PERMISSION = "com.picovr.payment.BILLING";
/**
 * Config plugin for expo-pico-iap.
 *
 * Declares the PICO billing permission. With a pico flavor (core
 * `buildVariant` `pico` or `dual`) it lands in the pico flavor manifest only,
 * so the quest and mobile APKs don't request it; with `buildVariant: 'mobile'`
 * it goes into the main manifest. Plugin order does not matter.
 */
declare const withPicoIap: ConfigPlugin<void>;
export default withPicoIap;
//# sourceMappingURL=withPicoIap.d.ts.map