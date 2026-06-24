import { ConfigPlugin } from '@expo/config-plugins';

import type { PicoPluginOptions } from './types';
import { resolveOptions } from './types';
import { withPicoAndroidManifest } from './withPicoAndroidManifest';
import { withPicoDiagnostics } from './withPicoDiagnostics';
import { withPicoAppBuildGradle, withPicoProjectBuildGradle } from './withPicoGradle';
import { withPicoGradleProperties } from './withPicoGradleProperties';
import { withPicoLocalProperties } from './withPicoLocalProperties';
import { withPicoMainApplication } from './withPicoMainApplication';
import { withPicoNewArchCheck } from './withPicoNewArchCheck';
import { withPicoOpenXrLoaderOverlay } from './withPicoOpenXrLoaderOverlay';
import { withPicoSettingsGradle } from './withPicoSettingsGradle';
import { withPicoStrings } from './withPicoStrings';
import { withPicoSwan } from './withPicoSwan';

/**
 * Main config plugin entrypoint for expo-pico-core.
 *
 * Orchestrates all Android project mutations required for PICO OS 6 / Swan
 * support. Each sub-plugin is responsible for a single concern and is
 * idempotent.
 *
 * Execution order:
 *   1. New-arch soft check (warning-only; never throws)
 *   2. Gradle properties (consumed by Gradle files)
 *   3. Project-level Gradle (PICO Maven repo)
 *   4. App-level Gradle (flavors / missingDimensionStrategy + BuildConfig)
 *   5. settings.gradle (Swan subproject inclusion, opt-in for xrMode='pico-swan')
 *   6. Swan composite (Swan-only Gradle deps + optional source set)
 *   7. strings.xml
 *   8. PICO-flavor AndroidManifest (withDangerousMod — writes source set file)
 *   9. MainApplication injection (PicoCorePackage with xrMode platform)
 *  10. local.properties (node binary path + optional PICO SDK paths)
 */
const withPico: ConfigPlugin<PicoPluginOptions | void> = (config, rawOptions) => {
  const options = resolveOptions(rawOptions ?? {});

  if (!options.enabled) {
    return config;
  }

  config = withPicoNewArchCheck(config, options);
  config = withPicoDiagnostics(config, options);
  config = withPicoGradleProperties(config, options);
  config = withPicoProjectBuildGradle(config, options);
  config = withPicoAppBuildGradle(config, options);
  config = withPicoSettingsGradle(config, options);
  config = withPicoSwan(config, options);
  config = withPicoStrings(config, options);

  if (options.buildVariant === 'pico' || options.buildVariant === 'dual') {
    config = withPicoAndroidManifest(config, options);
  }

  config = withPicoMainApplication(config, options);
  config = withPicoLocalProperties(config, options);
  // 16KB ELF alignment overlay — runs last so it sees the final
  // android/ tree (jniLibs are merged at packaging time).
  config = withPicoOpenXrLoaderOverlay(config, options);

  return config;
};

export default withPico;
