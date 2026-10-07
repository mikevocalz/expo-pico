import { ConfigPlugin } from '@expo/config-plugins';
import { withPicoFlavorFeature } from '@expo-pico/core/plugin';

import type { PicoSpatialPluginOptions } from './types';
import { resolveSpatialOptions } from './types';
import { withPicoSpatialProjectBuildGradle } from './withPicoSpatialGradle';
import { withPicoSpatialSdkRuntime } from './withPicoSpatialSdkRuntime';

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
const withPicoSpatial: ConfigPlugin<PicoSpatialPluginOptions | void> = (config, rawOptions) => {
  const options = resolveSpatialOptions(rawOptions ?? {});

  // 1. Project-level build.gradle — buildscript ext spatialToolsVersion
  config = withPicoSpatialProjectBuildGradle(config, options);

  // 2. PICO Spatial SDK 6 runtime, pico/dual flavors only. Opt-in: the
  //    native module compiles against it either way.
  if (options.enableSpatialSdk) {
    config = withPicoSpatialSdkRuntime(config);
  }

  // 3. PICO-only uses-feature entries, routed by core to the pico flavor
  //    manifest when one exists (main manifest otherwise).
  if (options.anchorPersistence) {
    config = withPicoFlavorFeature(config, { name: FEATURE_SPATIAL_ANCHOR });
  }
  if (options.sceneMeshEnabled) {
    config = withPicoFlavorFeature(config, { name: FEATURE_SCENE });
  }

  return config;
};

export default withPicoSpatial;
