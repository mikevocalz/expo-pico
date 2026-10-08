"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPicoFlavorManifestState = exports.withPicoFlavorFeature = exports.withPicoFlavorPermission = void 0;
const types_1 = require("./types");
const withPicoAndroidManifest_1 = require("./withPicoAndroidManifest");
const withPicoDiagnostics_1 = require("./withPicoDiagnostics");
const withPicoFlavorEntries_1 = require("./withPicoFlavorEntries");
const withPicoGradle_1 = require("./withPicoGradle");
const withPicoGradleProperties_1 = require("./withPicoGradleProperties");
const withPicoLocalProperties_1 = require("./withPicoLocalProperties");
const withPicoMainApplication_1 = require("./withPicoMainApplication");
const withPicoNewArchCheck_1 = require("./withPicoNewArchCheck");
const withPicoOpenXrLoaderOverlay_1 = require("./withPicoOpenXrLoaderOverlay");
const withPicoSettingsGradle_1 = require("./withPicoSettingsGradle");
const withPicoStrings_1 = require("./withPicoStrings");
const withPicoSwan_1 = require("./withPicoSwan");
const withQuestMetaLayout_1 = require("./withQuestMetaLayout");
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
 */
const withPico = (config, rawOptions) => {
    const options = (0, types_1.resolveOptions)(rawOptions ?? {});
    if (!options.enabled) {
        return config;
    }
    config = (0, withPicoNewArchCheck_1.withPicoNewArchCheck)(config, options);
    config = (0, withPicoDiagnostics_1.withPicoDiagnostics)(config, options);
    config = (0, withPicoGradleProperties_1.withPicoGradleProperties)(config, options);
    config = (0, withPicoGradle_1.withPicoProjectBuildGradle)(config, options);
    config = (0, withPicoGradle_1.withPicoAppBuildGradle)(config, options);
    config = (0, withPicoSettingsGradle_1.withPicoSettingsGradle)(config, options);
    config = (0, withPicoSwan_1.withPicoSwan)(config, options);
    config = (0, withPicoStrings_1.withPicoStrings)(config, options);
    if (options.buildVariant === 'pico' || options.buildVariant === 'dual') {
        // Feature plugins (iap, rooms, social, ...) route their PICO-only
        // permissions and features to this flavor manifest instead of main.
        (0, withPicoFlavorEntries_1.markPicoFlavorPresent)(config);
        config = (0, withPicoAndroidManifest_1.withPicoAndroidManifest)(config, options);
    }
    // pvr.app.id (PPS app ID) goes to the pico, dual and mobile flavor
    // manifests, never quest: the quest flavor targets Meta Horizon, which has
    // no PICO Platform Service. Main gets it only in a single-variant app
    // (buildVariant 'mobile' with no quest flavor from expo-horizon-core).
    config = (0, withPicoAndroidManifest_1.withPicoPlatformServiceManifest)(config, options);
    config = (0, withPicoMainApplication_1.withPicoMainApplication)(config, options);
    config = (0, withPicoLocalProperties_1.withPicoLocalProperties)(config, options);
    // Meta VR Layout SDK: quest flavor only, removed again when switched off.
    config = (0, withQuestMetaLayout_1.withQuestMetaLayout)(config, options);
    // 16KB ELF alignment overlay — runs last so it sees the final
    // android/ tree (jniLibs are merged at packaging time).
    config = (0, withPicoOpenXrLoaderOverlay_1.withPicoOpenXrLoaderOverlay)(config, options);
    return config;
};
exports.default = withPico;
var withPicoFlavorEntries_2 = require("./withPicoFlavorEntries");
Object.defineProperty(exports, "withPicoFlavorPermission", { enumerable: true, get: function () { return withPicoFlavorEntries_2.withPicoFlavorPermission; } });
Object.defineProperty(exports, "withPicoFlavorFeature", { enumerable: true, get: function () { return withPicoFlavorEntries_2.withPicoFlavorFeature; } });
Object.defineProperty(exports, "getPicoFlavorManifestState", { enumerable: true, get: function () { return withPicoFlavorEntries_2.getPicoFlavorManifestState; } });
//# sourceMappingURL=withPico.js.map