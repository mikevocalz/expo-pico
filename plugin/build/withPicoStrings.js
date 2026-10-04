"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPicoStrings = void 0;
const config_plugins_1 = require("@expo/config-plugins");
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
const withPicoStrings = (config, options) => {
    return (0, config_plugins_1.withStringsXml)(config, (config) => {
        const strings = config.modResults;
        // Legacy / core resources — always written.
        upsertStringResource(strings, 'pico_app_id', options.platformService.picoAppId ?? options.picoAppId);
        upsertStringResource(strings, 'pico_spatial_mode', options.spatialMode);
        const ps = options.platformService;
        upsertOrRemove(strings, 'pico_app_key', ps.picoAppKey);
        // Foreign (Global region) pair — only emitted when the consumer
        // explicitly sets `platformService.foreign`. Partial population is
        // allowed: a consumer may ship only a foreign app ID without a key.
        upsertOrRemove(strings, 'pico_app_id_foreign', ps.foreign.picoAppId);
        upsertOrRemove(strings, 'pico_app_key_foreign', ps.foreign.picoAppKey);
        // IAP identity — documented by PICO Native SDK Ch. 7. Neither is
        // required unless the app uses `expo-pico-iap`.
        upsertOrRemove(strings, 'pico_merchant_id', ps.picoMerchantId);
        upsertOrRemove(strings, 'pico_pay_key', ps.picoPayKey);
        upsertOrRemove(strings, 'pico_merchant_id_foreign', ps.foreign.picoMerchantId);
        upsertOrRemove(strings, 'pico_pay_key_foreign', ps.foreign.picoPayKey);
        return config;
    });
};
exports.withPicoStrings = withPicoStrings;
/**
 * Upsert when value is a non-null string; remove the resource when value
 * is null. This ensures toggling a Platform SDK field off (by removing it
 * from app.config) cleans up the corresponding string resource on the
 * next prebuild rather than leaving a stale entry.
 */
function upsertOrRemove(strings, name, value) {
    if (value == null) {
        removeStringResource(strings, name);
    }
    else {
        upsertStringResource(strings, name, value);
    }
}
/**
 * Adds or updates a string resource entry. Idempotent.
 */
function upsertStringResource(strings, name, value) {
    const resources = strings.resources;
    if (!resources.string) {
        resources.string = [];
    }
    const existing = resources.string.find((s) => s.$?.name === name);
    if (existing) {
        existing._ = value;
    }
    else {
        resources.string.push({
            $: { name, translatable: 'false' },
            _: value,
        });
    }
}
function removeStringResource(strings, name) {
    const resources = strings.resources;
    if (!resources.string)
        return;
    resources.string = resources.string.filter((s) => s.$?.name !== name);
}
exports.default = exports.withPicoStrings;
//# sourceMappingURL=withPicoStrings.js.map