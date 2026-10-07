"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPicoGradleProperties = void 0;
const config_plugins_1 = require("@expo/config-plugins");
const types_1 = require("./types");
/**
 * Injects PICO-related properties into gradle.properties.
 *
 * Uses withGradleProperties — the safe, structured mod for gradle.properties.
 * Properties are appended; duplicates are avoided by checking existing entries.
 *
 * Properties injected:
 *   - picoAppId: Read by the library's android/build.gradle to set BuildConfig fields
 *   - picoSpatialMode: Available to native code via gradle property
 *   - picoTargetProfile / picoContainerMode / picoEmulatorOptimizations:
 *     keep the library BuildConfig aligned with the app BuildConfig fields
 *   - picoBuildVariant: lets the library scope PICO_XR_MODE per flavor
 *   - picoBuildEnabled: Signals to sibling packages that PICO build infra is active
 */
const withPicoGradleProperties = (config, options) => {
    return (0, config_plugins_1.withGradleProperties)(config, (config) => {
        const props = config.modResults;
        const effectiveProfile = (0, types_1.resolveTargetProfile)(options);
        upsertProperty(props, 'picoAppId', options.platformService.picoAppId ?? options.picoAppId);
        upsertProperty(props, 'picoAppKey', options.platformService.picoAppKey ?? '');
        upsertProperty(props, 'picoSpatialMode', options.spatialMode);
        upsertProperty(props, 'picoTargetProfile', effectiveProfile);
        upsertProperty(props, 'picoContainerMode', options.defaultContainerMode);
        upsertProperty(props, 'picoXrMode', options.xrMode);
        upsertProperty(props, 'picoAppType', options.appType);
        // The library build.gradle reads this to decide whether its `mobile`
        // flavor is a separate phone APK (pico/dual) or the only variant.
        upsertProperty(props, 'picoBuildVariant', options.buildVariant);
        upsertProperty(props, 'picoEmulatorOptimizations', String(options.enableEmulatorOptimizations));
        upsertProperty(props, 'picoBuildEnabled', 'true');
        // Sibling plugins gate Swan-specific mutations on this flag.
        upsertProperty(props, 'picoSwanEnabled', String(options.xrMode === 'pico-swan'));
        // Sibling plugins (expo-pico-account, expo-pico-iap) gate their own
        // runtime init on these flags without having to parse plugin options.
        upsertProperty(props, 'picoPlatformIdentityEnabled', String(options.platformService.hasIdentity));
        upsertProperty(props, 'picoIapIdentityEnabled', String(options.platformService.hasIapIdentity));
        return config;
    });
};
exports.withPicoGradleProperties = withPicoGradleProperties;
/**
 * Adds or updates a property in the gradle.properties array. Idempotent.
 */
function upsertProperty(props, key, value) {
    const existing = props.find((p) => p.type === 'property' && 'key' in p && p.key === key);
    if (existing && existing.type === 'property') {
        existing.value = value;
    }
    else {
        props.push({ type: 'property', key, value });
    }
}
exports.default = exports.withPicoGradleProperties;
//# sourceMappingURL=withPicoGradleProperties.js.map