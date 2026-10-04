"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_SERVICE_ACTIVITIES = void 0;
exports.applyPlatformServiceContract = applyPlatformServiceContract;
/**
 * Platform SDK activities the PICO login/payment SDK launches as part of
 * its in-app browser and OAuth flow. Both are declared with
 * `android:exported="false"` because they are only launched from within
 * the PICO Platform SDK process; they are not intended to receive
 * intents from other apps.
 *
 * Source: PICO Native SDK Ch. 7 (Payment) and PICO Platform Service
 * integration guide. Names are stable across SDK versions.
 */
const PICO_AUTH_ACTIVITY = 'com.pico.loginpaysdk.UnityAuthInterface';
const PICO_BROWSER_ACTIVITY = 'com.pico.loginpaysdk.component.PicoSDKBrowser';
/**
 * In-place PICO Platform Service manifest mutation for the flavor
 * manifest. Adds the two login/payment activities and the Platform SDK
 * BuildConfig-mirror meta-data.
 *
 * Gated on `options.platformService.declareActivities && hasIdentity`.
 *
 * Idempotent: activities are keyed on `android:name`, so a repeat apply
 * updates the element in place rather than duplicating.
 *
 * Note on scope: Platform SDK identity. The activities
 * exist so the Platform SDK auth/payment flows bind correctly. The
 * actual `CoreService.Initialize` call remains an extension seam in
 * `PicoOs5Runtime` / sibling packages — this plugin only ensures the
 * manifest surface is correct when the consumer wires up identity.
 */
function applyPlatformServiceContract(manifest, options) {
    const ps = options.platformService;
    if (!ps.hasIdentity || !ps.declareActivities) {
        // Even with no identity, we still want to remove any stale activities
        // written by a previous prebuild in case the user just unset identity.
        removePlatformActivities(manifest);
        return manifest;
    }
    const application = ensureApplication(manifest);
    application.activity = application.activity ?? [];
    upsertActivity(application.activity, PICO_AUTH_ACTIVITY, {
        'android:name': PICO_AUTH_ACTIVITY,
        'android:exported': 'false',
        'tools:node': 'merge',
    });
    upsertActivity(application.activity, PICO_BROWSER_ACTIVITY, {
        'android:name': PICO_BROWSER_ACTIVITY,
        'android:exported': 'false',
        'tools:node': 'merge',
    });
    return manifest;
}
function upsertActivity(activities, name, attributes) {
    const existing = activities.find((a) => a.$?.['android:name'] === name);
    if (existing) {
        existing.$ = { ...existing.$, ...attributes };
        return;
    }
    activities.push({ $: { ...attributes } });
}
function removePlatformActivities(manifest) {
    const app = manifest.manifest.application?.[0];
    if (!app || !app.activity)
        return;
    app.activity = app.activity.filter((a) => a.$?.['android:name'] !== PICO_AUTH_ACTIVITY &&
        a.$?.['android:name'] !== PICO_BROWSER_ACTIVITY);
}
function ensureApplication(manifest) {
    manifest.manifest.application = manifest.manifest.application ?? [];
    if (manifest.manifest.application.length === 0) {
        manifest.manifest.application.push({ $: {} });
    }
    return manifest.manifest.application[0];
}
exports.PLATFORM_SERVICE_ACTIVITIES = {
    AUTH: PICO_AUTH_ACTIVITY,
    BROWSER: PICO_BROWSER_ACTIVITY,
};
exports.default = applyPlatformServiceContract;
//# sourceMappingURL=withPicoPlatformService.js.map