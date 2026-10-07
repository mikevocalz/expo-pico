"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_1 = require("@expo-pico/core/plugin");
const types_1 = require("./types");
const withPicoSpatialGradle_1 = require("./withPicoSpatialGradle");
const withPicoSpatialSdkRuntime_1 = require("./withPicoSpatialSdkRuntime");
const FEATURE_SPATIAL_ANCHOR = 'pico.software.spatialanchor';
const FEATURE_SCENE = 'pico.software.scene';
/**
 * Config plugin for expo-pico-spatial.
 *
 * Adds spatial-specific manifest declarations (pico flavor only when the
 * app has one). Relies on expo-pico-core
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
    // 3. PICO-only uses-feature entries, routed by core to the pico flavor
    //    manifest when one exists (main manifest otherwise).
    if (options.anchorPersistence) {
        config = (0, plugin_1.withPicoFlavorFeature)(config, { name: FEATURE_SPATIAL_ANCHOR });
    }
    if (options.sceneMeshEnabled) {
        config = (0, plugin_1.withPicoFlavorFeature)(config, { name: FEATURE_SCENE });
    }
    return config;
};
exports.default = withPicoSpatial;
//# sourceMappingURL=withPicoSpatial.js.map