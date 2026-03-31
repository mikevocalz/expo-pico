import { ConfigPlugin } from '@expo/config-plugins';

import type { PicoPluginOptions } from './types';
import { resolveOptions } from './types';
import { withPicoAndroidManifest } from './withPicoAndroidManifest';
import { withPicoAppBuildGradle, withPicoProjectBuildGradle } from './withPicoGradle';
import { withPicoGradleProperties } from './withPicoGradleProperties';
import { withPicoLocalProperties } from './withPicoLocalProperties';
import { withPicoStrings } from './withPicoStrings';

/**
 * Main config plugin entrypoint for expo-pico-core.
 *
 * Orchestrates all Android project mutations required for PICO OS 6 support.
 * Each sub-plugin is responsible for a single concern and is idempotent.
 *
 * Plugin execution order matters:
 * 1. Gradle properties first (consumed by Gradle files)
 * 2. Project-level Gradle (Maven repo for PICO SDK)
 * 3. App-level Gradle (flavors, BuildConfig)
 * 4. Strings (resource values)
 * 5. PICO-flavor AndroidManifest (withDangerousMod — writes source set file)
 *
 * The order ensures that:
 * - Gradle properties are available before Gradle files read them
 * - Flavor directories exist before manifest files are written into them
 * - No circular dependencies between mutation steps
 */
const withPico: ConfigPlugin<PicoPluginOptions | void> = (config, rawOptions) => {
  const options = resolveOptions(rawOptions ?? {});

  if (!options.enabled) {
    return config;
  }

  // 1. Gradle properties — consumed by native build.gradle files
  config = withPicoGradleProperties(config, options);

  // 2. Project-level build.gradle — PICO Maven repository
  config = withPicoProjectBuildGradle(config, options);

  // 3. App-level build.gradle — product flavors / missingDimensionStrategy + BuildConfig fields
  //    Always runs: when buildVariant='pico'/'dual', injects flavors; when 'mobile', injects
  //    missingDimensionStrategy so the library's "device" flavor dimension resolves correctly.
  config = withPicoAppBuildGradle(config, options);

  // 4. strings.xml — PICO string resources
  config = withPicoStrings(config, options);

  // 5. PICO-flavor AndroidManifest.xml — only needed when flavors are injected
  if (options.buildVariant === 'pico' || options.buildVariant === 'dual') {
    config = withPicoAndroidManifest(config, options);
  }

  // 6. local.properties + Gradle node-path patches — ensures Android Studio
  //    can resolve `node` (nvm) and that PICO SDK/Editor paths are set.
  config = withPicoLocalProperties(config, options);

  return config;
};

export default withPico;
