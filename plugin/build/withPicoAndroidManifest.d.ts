import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Writes `pvr.app.id` (and other PPS-required metadata) into the **main**
 * AndroidManifest so every build flavor — `pico`, `quest`, `mobile`, `dual`
 * — sees it. The PICO Platform Service SDK reads it at first call via
 * `AppUtils.getAppIdFromManifest("pvr.app.id")`; if the active flavor's
 * merged manifest doesn't have it, the server rejects with 100008
 * "appkey is empty".
 *
 * Idempotent via `tools:node="replace"` semantics on the meta-data tag.
 */
export declare const withPicoPlatformServiceMainManifest: ConfigPlugin<ResolvedPicoOptions>;
export declare const withPicoAndroidManifest: ConfigPlugin<ResolvedPicoOptions>;
export default withPicoAndroidManifest;
//# sourceMappingURL=withPicoAndroidManifest.d.ts.map