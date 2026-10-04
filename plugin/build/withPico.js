"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const withPicoAndroidManifest_1 = require("./withPicoAndroidManifest");
const withPicoDiagnostics_1 = require("./withPicoDiagnostics");
const withPicoGradle_1 = require("./withPicoGradle");
const withPicoGradleProperties_1 = require("./withPicoGradleProperties");
const withPicoLocalProperties_1 = require("./withPicoLocalProperties");
const withPicoMainApplication_1 = require("./withPicoMainApplication");
const withPicoNewArchCheck_1 = require("./withPicoNewArchCheck");
const withPicoOpenXrLoaderOverlay_1 = require("./withPicoOpenXrLoaderOverlay");
const withPicoSettingsGradle_1 = require("./withPicoSettingsGradle");
const withPicoStrings_1 = require("./withPicoStrings");
const withPicoSwan_1 = require("./withPicoSwan");
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
        config = (0, withPicoAndroidManifest_1.withPicoAndroidManifest)(config, options);
    }
    // pvr.app.id lives in the MAIN manifest (not the pico flavor manifest)
    // so every build flavor — pico, quest, mobile, dual — exposes it to the
    // PPS SDK ContentProvider. Without this, non-pico flavors hit
    // `100008 appkey is empty` at first SDK call.
    config = (0, withPicoAndroidManifest_1.withPicoPlatformServiceMainManifest)(config, options);
    config = (0, withPicoMainApplication_1.withPicoMainApplication)(config, options);
    config = (0, withPicoLocalProperties_1.withPicoLocalProperties)(config, options);
    // 16KB ELF alignment overlay — runs last so it sees the final
    // android/ tree (jniLibs are merged at packaging time).
    config = (0, withPicoOpenXrLoaderOverlay_1.withPicoOpenXrLoaderOverlay)(config, options);
    return config;
};
exports.default = withPico;
//# sourceMappingURL=withPico.js.map