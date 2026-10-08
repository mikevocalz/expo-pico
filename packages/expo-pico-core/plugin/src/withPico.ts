import { ConfigPlugin } from '@expo/config-plugins';

import type { PicoPluginOptions } from './types';
import { resolveOptions } from './types';
import {
  withPicoAndroidManifest,
  withPicoPlatformServiceManifest,
} from './withPicoAndroidManifest';
import { withMetaEntryRemovals } from './withMetaEntryRemovals';
import { withPicoDiagnostics } from './withPicoDiagnostics';
import { markPicoFlavorPresent } from './withPicoFlavorEntries';
import { withPicoAppBuildGradle, withPicoProjectBuildGradle } from './withPicoGradle';
import { withPicoGradleProperties } from './withPicoGradleProperties';
import { withPicoLocalProperties } from './withPicoLocalProperties';
import { withPicoMainApplication } from './withPicoMainApplication';
import { withPicoNewArchCheck } from './withPicoNewArchCheck';
import { withPicoOpenXrLoaderOverlay } from './withPicoOpenXrLoaderOverlay';
import { withPicoSettingsGradle } from './withPicoSettingsGradle';
import { withPicoStrings } from './withPicoStrings';
import { withPicoSwan } from './withPicoSwan';
import { withQuestMetaLayout } from './withQuestMetaLayout';
import { withQuestRemovals } from './withQuestRemovals';

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
 *   9. MainApplication (New Architecture flag guard; strips legacy PicoCorePackage lines)
 *  10. local.properties (node binary path + optional PICO SDK paths)
 *  11. Meta VR Layout SDK (quest flavor only, opt-in via metaLayoutSdk)
 *  12. Quest-only removals (questRemovePermissions / questRemoveFeatures /
 *      questExcludeDependencies)
 *  13. Meta-only entries removed from the pico, dual and mobile flavors
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
    // Feature plugins (iap, rooms, social, ...) route their PICO-only
    // permissions and features to this flavor manifest instead of main.
    markPicoFlavorPresent(config);
    config = withPicoAndroidManifest(config, options);
  }

  // pvr.app.id (PPS app ID) goes to the pico, dual and mobile flavor
  // manifests, never quest: the quest flavor targets Meta Horizon, which has
  // no PICO Platform Service. Main gets it only in a single-variant app
  // (buildVariant 'mobile' with no quest flavor from expo-horizon-core).
  config = withPicoPlatformServiceManifest(config, options);

  config = withPicoMainApplication(config, options);
  config = withPicoLocalProperties(config, options);
  // Meta VR Layout SDK: quest flavor only, removed again when switched off.
  config = withQuestMetaLayout(config, options);
  // Quest-only permission, feature and dependency removals.
  config = withQuestRemovals(config, options);
  // Meta-only entries Viro writes to main (and its AAR declares) get removal
  // markers in the pico, dual and mobile flavor manifests. Quest keeps them.
  config = withMetaEntryRemovals(config);
  // 16KB ELF alignment overlay — runs last so it sees the final
  // android/ tree (jniLibs are merged at packaging time).
  config = withPicoOpenXrLoaderOverlay(config, options);

  return config;
};

export default withPico;

export {
  withPicoFlavorPermission,
  withPicoFlavorFeature,
  getPicoFlavorManifestState,
} from './withPicoFlavorEntries';
export type { PicoFlavorManifestState, PicoFlavorFeature } from './withPicoFlavorEntries';
