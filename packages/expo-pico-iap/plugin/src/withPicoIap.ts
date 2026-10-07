import { ConfigPlugin } from '@expo/config-plugins';
import { withPicoFlavorPermission } from '@expo-pico/core/plugin';

export const PICO_BILLING_PERMISSION = 'com.picovr.payment.BILLING';

/**
 * Config plugin for expo-pico-iap.
 *
 * Declares the PICO billing permission. With a pico flavor (core
 * `buildVariant` `pico` or `dual`) it lands in the pico flavor manifest only,
 * so the quest and mobile APKs don't request it; with `buildVariant: 'mobile'`
 * it goes into the main manifest. Plugin order does not matter.
 */
const withPicoIap: ConfigPlugin<void> = (config) =>
  withPicoFlavorPermission(config, PICO_BILLING_PERMISSION);

export default withPicoIap;
