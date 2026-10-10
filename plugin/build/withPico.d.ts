import { ConfigPlugin } from '@expo/config-plugins';
import type { PicoPluginOptions } from './types';
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
 *  11. Meta-only entries removed from the pico, dual and mobile flavors
 *  12. PICO renderer and loader overlays (pico and dual flavors)
 *
 * The Meta Horizon `quest` flavor and everything in it belong to the
 * expo-horizon-core plugin entry. With no PICO app ID this plugin builds no
 * pico flavor (see `ResolvedPicoOptions.isPicoEnabled`).
 */
declare const withPico: ConfigPlugin<PicoPluginOptions | void>;
export default withPico;
export { withPicoFlavorPermission, withPicoFlavorFeature, getPicoFlavorManifestState, } from './withPicoFlavorEntries';
export type { PicoFlavorManifestState, PicoFlavorFeature } from './withPicoFlavorEntries';
//# sourceMappingURL=withPico.d.ts.map