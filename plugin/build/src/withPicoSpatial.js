"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const types_1 = require("./types");
const withPicoSpatialGradle_1 = require("./withPicoSpatialGradle");
const withPicoSpatialSdkRuntime_1 = require("./withPicoSpatialSdkRuntime");
const FEATURE_SPATIAL_ANCHOR = 'pico.software.spatialanchor';
const FEATURE_SCENE = 'pico.software.scene';
/**
 * Config plugin for expo-pico-spatial.
 *
 * Adds spatial-specific manifest declarations. Relies on expo-pico-core
 * being listed first in the plugins array (for flavor/repo injection).
 *
 * This plugin does NOT re-inject flavors or repos — core owns those.
 */
const withPicoSpatial = (config, rawOptions) => {
    const options = (0, types_1.resolveSpatialOptions)(rawOptions ?? {});
    // 1. Project-level build.gradle — buildscript ext spatialToolsVersion
    config = (0, withPicoSpatialGradle_1.withPicoSpatialProjectBuildGradle)(config, options);
    // 2. PICO Spatial SDK 6 runtime, pico/dual flavors only. Opt-in: the
    //    native module compiles against it either way.
    if (options.enableSpatialSdk) {
        config = (0, withPicoSpatialSdkRuntime_1.withPicoSpatialSdkRuntime)(config);
    }
    if (options.anchorPersistence || options.sceneMeshEnabled) {
        config = (0, config_plugins_1.withAndroidManifest)(config, (config) => {
            const manifest = config.modResults.manifest;
            if (!manifest['uses-feature'])
                manifest['uses-feature'] = [];
            if (options.anchorPersistence) {
                const exists = manifest['uses-feature'].some((f) => f.$?.['android:name'] === FEATURE_SPATIAL_ANCHOR);
                if (!exists) {
                    manifest['uses-feature'].push({
                        $: { 'android:name': FEATURE_SPATIAL_ANCHOR, 'android:required': 'false' },
                    });
                }
            }
            if (options.sceneMeshEnabled) {
                const exists = manifest['uses-feature'].some((f) => f.$?.['android:name'] === FEATURE_SCENE);
                if (!exists) {
                    manifest['uses-feature'].push({
                        $: { 'android:name': FEATURE_SCENE, 'android:required': 'false' },
                    });
                }
            }
            return config;
        });
    }
    return config;
};
exports.default = withPicoSpatial;
//# sourceMappingURL=withPicoSpatial.js.map