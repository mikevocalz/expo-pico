import { ConfigPlugin } from '@expo/config-plugins';
/**
 * Config plugin for expo-pico-subscription.
 *
 * Adds the PICO billing permission. Idempotent — safe to use alongside
 * expo-pico-iap (both declare the same permission; Android manifest merger
 * deduplicates automatically, and the guard check prevents double-push
 * into the config plugin output array).
 *
 * Does NOT inject flavors or Maven repos — core owns those.
 */
declare const withPicoSubscription: ConfigPlugin<void>;
export default withPicoSubscription;
//# sourceMappingURL=withPicoSubscription.d.ts.map