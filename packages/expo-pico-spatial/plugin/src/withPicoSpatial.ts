import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

import type { PicoSpatialPluginOptions } from './types';
import { resolveSpatialOptions } from './types';
import { withPicoSpatialProjectBuildGradle } from './withPicoSpatialGradle';

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
const withPicoSpatial: ConfigPlugin<PicoSpatialPluginOptions | void> = (config, rawOptions) => {
  const options = resolveSpatialOptions(rawOptions ?? {});

  // 1. Project-level build.gradle — buildscript ext spatialToolsVersion
  config = withPicoSpatialProjectBuildGradle(config, options);

  if (options.anchorPersistence || options.sceneMeshEnabled) {
    config = withAndroidManifest(config, (config) => {
      const manifest = config.modResults.manifest;
      if (!manifest['uses-feature']) manifest['uses-feature'] = [];

      if (options.anchorPersistence) {
        const exists = manifest['uses-feature'].some(
          (f: any) => f.$?.['android:name'] === FEATURE_SPATIAL_ANCHOR
        );
        if (!exists) {
          manifest['uses-feature'].push({
            $: { 'android:name': FEATURE_SPATIAL_ANCHOR, 'android:required': 'false' },
          } as any);
        }
      }

      if (options.sceneMeshEnabled) {
        const exists = manifest['uses-feature'].some(
          (f: any) => f.$?.['android:name'] === FEATURE_SCENE
        );
        if (!exists) {
          manifest['uses-feature'].push({
            $: { 'android:name': FEATURE_SCENE, 'android:required': 'false' },
          } as any);
        }
      }

      return config;
    });
  }

  return config;
};

export default withPicoSpatial;
