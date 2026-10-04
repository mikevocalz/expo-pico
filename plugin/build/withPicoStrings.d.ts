import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Injects PICO-related string resources into `strings.xml`.
 *
 * Uses `withStringsXml` — the safe, structured mod for Android string
 * resources. All mutations are idempotent: existing entries are updated in
 * place, new entries are appended. Entries are marked `translatable="false"`.
 *
 * Resources written:
 *
 *   Always (from top-level plugin options):
 *     - `pico_app_id`           — PICO app ID (legacy key; retained for
 *                                  backwards compatibility with earlier
 *                                  plugin versions).
 *     - `pico_spatial_mode`     — Configured spatial mode string.
 *
 *   When `platformService` identity is provided:
 *     - `pico_app_key`          — Platform SDK app key.
 *     - `pico_app_id_foreign`   — Global-region app ID (if provided).
 *     - `pico_app_key_foreign`  — Global-region app key (if provided).
 *     - `pico_merchant_id`      — IAP merchant ID.
 *     - `pico_pay_key`          — IAP pay key.
 *     - `pico_merchant_id_foreign`, `pico_pay_key_foreign` — region pair.
 *
 * The `platformService.picoAppId` field takes precedence over the legacy
 * top-level `picoAppId` option when both are provided. When neither is
 * set, `pico_app_id` is still written as an empty string so
 * `R.string.pico_app_id` resolves cleanly at runtime (the Platform SDK
 * init call inspects the emptiness to decide whether to early-return).
 *
 * Source for key names:
 *   - PICO Native SDK Ch. 7 (Payment): `pico_app_id`, `pico_app_key`,
 *     `pico_merchant_id`, `pico_pay_key`.
 *   - PICO Platform Service SDK integration guide: `pico_app_id` /
 *     `pico_app_key` pair with `_foreign` siblings for the Global region.
 */
export declare const withPicoStrings: ConfigPlugin<ResolvedPicoOptions>;
export default withPicoStrings;
//# sourceMappingURL=withPicoStrings.d.ts.map