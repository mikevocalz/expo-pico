import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Declares `pvr.app.id`, the only PICO Platform Service meta-data core emits.
 * The PPS SDK reads it via `AppUtils.getAppIdFromManifest("pvr.app.id")` and
 * rejects calls with 100008 "appkey is empty" when the APK lacks it.
 *
 * Routing (see `PicoManifestRoute`): with a pico flavor it goes to the pico,
 * dual and mobile flavor manifests; with no pico flavor but a quest flavor
 * (expo-horizon-core next to `buildVariant: 'mobile'`) it goes to the mobile
 * flavor; a single-variant app gets it in main. The quest flavor targets Meta
 * Horizon, which has no PPS, so it never gets it, and a copy an older
 * prebuild left in main or in the mobile flavor is removed when it no longer
 * belongs there.
 *
 * Gated on the same ID withPicoStrings writes to `@string/pico_app_id`
 * (`platformService.picoAppId`, falling back to `picoAppId`), so the
 * reference never dangles.
 */
export declare const withPicoPlatformServiceManifest: ConfigPlugin<ResolvedPicoOptions>;
export declare const withPicoAndroidManifest: ConfigPlugin<ResolvedPicoOptions>;
export default withPicoAndroidManifest;
//# sourceMappingURL=withPicoAndroidManifest.d.ts.map