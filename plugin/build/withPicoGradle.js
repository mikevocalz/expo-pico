"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPicoProjectBuildGradle = exports.withPicoAppBuildGradle = void 0;
exports.renderFlavorBlock = renderFlavorBlock;
exports.renderFlavorXrModeBlock = renderFlavorXrModeBlock;
exports.removeIdentityGate = removeIdentityGate;
exports.updateOverlayPackaging = updateOverlayPackaging;
const config_plugins_1 = require("@expo/config-plugins");
const constants_1 = require("./constants");
const ppsArtifacts_1 = require("./ppsArtifacts");
const types_1 = require("./types");
const utils_1 = require("./utils");
const FLAVOR_MARKER = '// expo-pico-core: flavor dimensions';
const MISSING_DIM_MARKER = '// expo-pico-core: missing dimension strategy';
const PICO_SDK_MARKER = '// expo-pico-core: pico sdk config';
const PICO_REPO_MARKER = '// expo-pico-core: pico maven repo';
const HERMES_PATH_MARKER = '// expo-pico-core: hermesc path compatibility';
const SUBPROJECT_MISSING_DIM_MARKER = '// expo-pico-core: subprojects missing-dim fallback';
const APP_LIBS_AAR_MARKER = '// expo-pico-core: auto-include app/libs/*.aar (PICO Platform SDK)';
const PPS_DEPS_MARKER = '// expo-pico-core: PICO Platform Service SDK (com.pico.pps:*) deps';
const PPS_PIN_MARKER = '// expo-pico-core: single-version pin for com.pico.pps:*';
const FLAVOR_XR_MODE_MARKER = '// expo-pico-core: per-flavor PICO_XR_MODE / PICO_APP_TYPE';
const LEGACY_HERMES_PATH_PATTERN = /\n\s*hermesCommand\s*=.*\/sdks\/hermesc\/%OS-BIN%\/hermesc"\n/;
const HERMES_COMMENT_ONLY_PATTERN = /\n\s*\/\/ expo-pico-core: hermesc path compatibility\n\s*\/\/ Let the React Native Gradle plugin resolve hermesc for the installed RN version\.\n/;
const ANY_HERMES_COMMAND_PATTERN = /^\s*hermesCommand\s*=.*$/m;
const HERMES_COMPAT_BLOCK = `
    ${HERMES_PATH_MARKER}
    hermesCommand = new File([nodeBin, "--print", "require.resolve('hermes-compiler/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/hermesc/%OS-BIN%/hermesc"
`;
const PICO_REPO_BLOCK = `
        ${PICO_REPO_MARKER}
        maven {
            url "${constants_1.PICO_MAVEN_REPO}"
            content {
                includeGroup "${constants_1.PICO_SDK_GROUP}"
                includeGroup "${constants_1.PICO_PLATFORM_SDK_GROUP}"
            }
        }
        // PICO Platform Service SDK (com.pico.pps:*) — public maven hosted
        // by Bytedance, referenced from the PPS integration doc at
        // https://developer.picoxr.com/document/platform_service/integrate-the-pico-platform-service-sdk/
        maven {
            url "https://artifact.bytedance.com/repository/Volcengine/"
            content {
                includeGroup "com.pico.pps"
                includeGroup "com.pico"
            }
        }
`;
/**
 * Render the `productFlavors { ... }` block injected into `app/build.gradle`.
 *
 * Extracted from the plugin so unit tests can verify the string shape
 * (ABI filter presence, dual-flavor suffix, SDK version interpolation)
 * without spinning up the full @expo/config-plugins mod pipeline.
 *
 * The `pico` (and `dual`) flavors get `ndk { abiFilters 'arm64-v8a' }`
 * when `options.ndkAbiFilters` is true. PICO 4 / 4 Ultra / Swan are all
 * 64-bit ARM. Renderer-agnostic — same filter whether the app renders
 * with `@reactvision/react-viro`, Unity-as-a-Library, or any other
 * Android-side renderer.
 *
 * The `mobile` flavor is deliberately never ABI-filtered so phone /
 * tablet builds keep whatever abiFilters the consuming app already set.
 */
function renderFlavorBlock(options) {
    const abiFiltersLine = options.ndkAbiFilters
        ? `\n            ndk { abiFilters ${constants_1.PICO_FLAVOR_ABI_FILTERS.map((a) => `'${a}'`).join(', ')} }`
        : '';
    const dualFlavor = options.buildVariant === 'dual'
        ? `
        dual {
            dimension "device"
            matchingFallbacks = ['pico', 'mobile']
            minSdkVersion ${options.minSdkVersion}
            targetSdkVersion ${options.targetSdkVersion}${abiFiltersLine}
        }`
        : '';
    const picoMissingDimensionLine = options.buildVariant === 'pico' || options.buildVariant === 'dual'
        ? `
            matchingFallbacks = ['mobile']`
        : '';
    return `
    ${FLAVOR_MARKER}
    flavorDimensions += "device"
    productFlavors {
        mobile { dimension "device" }
        pico {
            dimension "device"
            minSdkVersion ${options.minSdkVersion}
            targetSdkVersion ${options.targetSdkVersion}${abiFiltersLine}${picoMissingDimensionLine}
        }${dualFlavor}
    }
`;
}
/**
 * Render the per-flavor `PICO_XR_MODE` / `PICO_APP_TYPE` overrides.
 *
 * `android.defaultConfig` carries the configured `xrMode` / `appType`, and
 * every flavor inherits it. Without these overrides the `quest` and `mobile`
 * APKs report `pico-os5` at runtime. A flavor's `buildConfigField` replaces
 * the defaultConfig field of the same name, so:
 *   - `pico` / `dual`: keep the configured values from defaultConfig
 *   - `quest`: `PICO_XR_MODE = "quest"`, `PICO_APP_TYPE` = configured appType,
 *     read from gradle.properties (`picoAppType`) at build time so a changed
 *     appType applies on the next prebuild even though this block is not
 *     rewritten
 *   - `mobile`: `PICO_XR_MODE = "mobile"`, `PICO_APP_TYPE = "2d"`
 *
 * Only emitted when the app has flavors (`buildVariant` `pico` or `dual`);
 * a `mobile` buildVariant app has a single variant that keeps the configured
 * values. The library module applies the same mapping to its own BuildConfig
 * (see `android/build.gradle`), which is the one `PicoCoreV2` reads.
 */
function renderFlavorXrModeBlock(options) {
    return `${FLAVOR_XR_MODE_MARKER}
android.productFlavors.configureEach { flavor ->
    if (flavor.name == "quest") {
        flavor.buildConfigField "String", "PICO_XR_MODE", "\\"quest\\""
        flavor.buildConfigField "String", "PICO_APP_TYPE", "\\"\${project.findProperty('picoAppType') ?: '${options.appType}'}\\""
    } else if (flavor.name == "mobile") {
        flavor.buildConfigField "String", "PICO_XR_MODE", "\\"mobile\\""
        flavor.buildConfigField "String", "PICO_APP_TYPE", "\\"2d\\""
    }
}
`;
}
/**
 * Removes the identity gate an earlier plugin version wrote into
 * app/build.gradle. PICO is now off until a picoAppId is set, so there is
 * nothing to gate.
 */
function removeIdentityGate(contents) {
    return contents.replace(/\n\/\/ expo-pico-core: begin identity gate[\s\S]*?\/\/ expo-pico-core: end identity gate\n?/g, '');
}
/**
 * Let the overlay copies win over the AAR's in the variants that get them:
 * pico/dual take both libraries, quest takes only the renderer (see
 * `syncPicoOverlays`). Mobile gets neither. Also removes our old global rule.
 */
function updateOverlayPackaging(contents, options) {
    contents = contents.replace(/\n[ \t]*\/\/ expo-pico-core: 16KB openxr loader overlay\s+packagingOptions\s*\{\s*jniLibs\s*\{\s*pickFirsts \+= \["\*\*\/libopenxr_loader\.so"\]\s*\}\s*\}/g, '');
    contents = contents.replace(/\n\/\/ expo-pico-core: begin flavor overlays[\s\S]*?\/\/ expo-pico-core: end flavor overlays\n?/g, '');
    const libraries = [
        ...(options.openXrLoaderOverlay ? ['**/libopenxr_loader.so'] : []),
        ...(options.viroRendererOverlay ? ['**/libviro_renderer.so'] : []),
    ];
    if (libraries.length === 0 || options.buildVariant === 'mobile')
        return contents;
    return (contents +
        `
// expo-pico-core: begin flavor overlays
androidComponents {
    onVariants(selector().all()) { variant ->
        if (variant.productFlavors.any { it.first == "device" && it.second in ["pico", "dual"] }) {
            variant.packaging.jniLibs.pickFirsts.addAll(${JSON.stringify(libraries)})
        }
    }
}
// expo-pico-core: end flavor overlays
`);
}
const withPicoAppBuildGradle = (config, options) => {
    return (0, config_plugins_1.withAppBuildGradle)(config, (config) => {
        let contents = config.modResults.contents;
        const effectiveProfile = (0, types_1.resolveTargetProfile)(options);
        const projectRoot = config.modRequest.projectRoot;
        if (LEGACY_HERMES_PATH_PATTERN.test(contents)) {
            contents = contents.replace(LEGACY_HERMES_PATH_PATTERN, HERMES_COMPAT_BLOCK);
        }
        else if (HERMES_COMMENT_ONLY_PATTERN.test(contents)) {
            contents = contents.replace(HERMES_COMMENT_ONLY_PATTERN, HERMES_COMPAT_BLOCK);
        }
        else if (!(0, utils_1.gradleContains)(contents, HERMES_PATH_MARKER) &&
            !ANY_HERMES_COMMAND_PATTERN.test(contents)) {
            const result = (0, utils_1.insertAfterPattern)(contents, /reactNativeDir\s*=.*\n/, HERMES_COMPAT_BLOCK);
            if (result) {
                contents = result;
            }
        }
        if (options.buildVariant === 'pico' || options.buildVariant === 'dual') {
            if (!(0, utils_1.gradleContains)(contents, FLAVOR_MARKER)) {
                const flavorBlock = renderFlavorBlock(options);
                const result = (0, utils_1.insertAfterPattern)(contents, /android\s*\{/, flavorBlock);
                if (result) {
                    contents = result;
                }
                else {
                    console.warn('[expo-pico-core] Could not find android {} block in app/build.gradle');
                }
            }
        }
        else {
            if (!(0, utils_1.gradleContains)(contents, MISSING_DIM_MARKER)) {
                const dimStrategyBlock = `
    ${MISSING_DIM_MARKER}
    defaultConfig {
        missingDimensionStrategy "device", "mobile"
    }
`;
                const result = (0, utils_1.insertAfterPattern)(contents, /android\s*\{/, dimStrategyBlock);
                if (result) {
                    contents = result;
                }
                else {
                    console.warn('[expo-pico-core] Could not find android {} block in app/build.gradle');
                }
            }
        }
        // PICO Platform Service SDK (PPS) deps — pulled from the public
        // Volcengine maven that withPicoProjectBuildGradle already registers.
        // Confirmed downloadable without auth via direct artifact paths;
        // browsing the repo root returns 403, but resolving specific
        // group/artifact/version tuples succeeds.
        //
        // Declared here, in the app module, and nowhere else: no sibling
        // @expo-pico/* package carries a com.pico.pps coordinate, so adding
        // more of them to an app never doubles a declaration. Which services
        // land is derived from the packages actually installed.
        //
        // Consumers don't need to drop any AAR files — Gradle pulls each
        // service from maven on first build. The bounded AAR-drop fallback
        // below stays in place for offline / air-gapped builds.
        //
        // Declared per flavor, not on the bare `implementation` configuration:
        // `xrMode` and `buildVariant` are independent, so a `pico-os5` app
        // built as `dual` also produces mobile* and quest* variants that must
        // not carry the PICO SDK.
        const ppsConfigurations = (0, ppsArtifacts_1.resolvePpsConfigurations)(options.buildVariant);
        if (options.xrMode !== 'mobile' && !(0, utils_1.gradleContains)(contents, PPS_DEPS_MARKER)) {
            const services = (0, ppsArtifacts_1.resolvePpsServices)(options.platformService.services, (0, ppsArtifacts_1.createPackageResolver)(projectRoot));
            contents =
                contents + '\n' + (0, ppsArtifacts_1.renderPpsDependenciesBlock)(services, PPS_DEPS_MARKER, ppsConfigurations);
        }
        // PICO Platform SDK AAR drop-in (offline fallback). Consumers who
        // need to vendor the AARs into source control (air-gapped CI, etc.)
        // can drop them into android/app/libs/. Anything PPS already resolves
        // from maven is excluded by name — see renderLocalAarBlock.
        if (options.xrMode !== 'mobile' && !(0, utils_1.gradleContains)(contents, APP_LIBS_AAR_MARKER)) {
            contents = contents + '\n' + (0, ppsArtifacts_1.renderLocalAarBlock)(APP_LIBS_AAR_MARKER, ppsConfigurations);
        }
        // Upgrade the old generated global pickFirst block, including when users
        // turn an overlay off without a clean prebuild. Other packaging stays intact.
        contents = updateOverlayPackaging(contents, options);
        contents = removeIdentityGate(contents);
        // Also repair already-generated flavor blocks during incremental prebuild.
        const fallbackMarker = '// expo-pico-core: device flavor fallbacks';
        if (options.buildVariant !== 'mobile' && !contents.includes(fallbackMarker)) {
            contents += `
${fallbackMarker}
android.productFlavors.configureEach { flavor ->
    def fallbacks = flavor.name == "dual" ? ["pico", "mobile"] :
        (flavor.name == "pico" ? ["mobile"] : [])
    flavor.matchingFallbacks.addAll(fallbacks.findAll { !flavor.matchingFallbacks.contains(it) })
}
`;
        }
        if (!(0, utils_1.gradleContains)(contents, PICO_SDK_MARKER)) {
            const emulatorFlag = options.enableEmulatorOptimizations ? 'true' : 'false';
            const refreshRatesValue = options.refreshRates.join(',');
            const targetDevicesValue = options.targetDevices.join(',');
            const buildConfigBlock = `
${PICO_SDK_MARKER}
def picoAppIdValue = "\\"${options.platformService.picoAppId ?? options.picoAppId ?? ''}\\""
def picoAppKeyValue = "\\"${options.platformService.picoAppKey ?? ''}\\""
def picoSpatialModeValue = "\\"${options.spatialMode}\\""
def picoTargetProfileValue = "\\"${effectiveProfile}\\""
def picoContainerModeValue = "\\"${options.defaultContainerMode}\\""
def picoXrModeValue = "\\"${options.xrMode}\\""
def picoAppTypeValue = "\\"${options.appType}\\""
def picoHasPlatformIdentityValue = "${options.platformService.hasIdentity}"
def picoHasIapIdentityValue = "${options.platformService.hasIapIdentity}"
def picoRefreshRatesValue = "\\"${refreshRatesValue}\\""
def picoTargetDevicesValue = "\\"${targetDevicesValue}\\""

android.defaultConfig {
    buildConfigField "String", "PICO_APP_ID", picoAppIdValue
    buildConfigField "String", "PICO_APP_KEY", picoAppKeyValue
    buildConfigField "String", "PICO_SPATIAL_MODE", picoSpatialModeValue
    buildConfigField "String", "PICO_TARGET_PROFILE", picoTargetProfileValue
    buildConfigField "String", "PICO_CONTAINER_MODE", picoContainerModeValue
    buildConfigField "String", "PICO_XR_MODE", picoXrModeValue
    buildConfigField "String", "PICO_APP_TYPE", picoAppTypeValue
    buildConfigField "boolean", "PICO_HAS_PLATFORM_IDENTITY", picoHasPlatformIdentityValue
    buildConfigField "boolean", "PICO_HAS_IAP_IDENTITY", picoHasIapIdentityValue
    buildConfigField "boolean", "PICO_EMULATOR_OPTIMIZATIONS", "${emulatorFlag}"
    // Capability declarations exposed at runtime so JS code can
    // ask "did the prebuild flag X?" without re-reading the manifest.
    buildConfigField "boolean", "PICO_HAND_TRACKING", "${options.handTracking}"
    buildConfigField "boolean", "PICO_PASSTHROUGH", "${options.passthrough}"
    buildConfigField "boolean", "PICO_SCENE_UNDERSTANDING", "${options.sceneUnderstanding}"
    buildConfigField "boolean", "PICO_EYE_TRACKING", "${options.eyeTracking}"
    buildConfigField "boolean", "PICO_FACE_TRACKING", "${options.faceTracking}"
    buildConfigField "boolean", "PICO_BODY_TRACKING", "${options.bodyTracking}"
    buildConfigField "boolean", "PICO_SPATIAL_AUDIO", "${options.spatialAudio}"
    buildConfigField "boolean", "PICO_FOVEATED_RENDERING", "${options.foveatedRendering}"
    buildConfigField "boolean", "PICO_HIGH_SAMPLING_RATE_SENSORS", "${options.highSamplingRateSensors}"
    buildConfigField "boolean", "PICO_BOUNDARY", "${options.boundary}"
    buildConfigField "boolean", "PICO_SCENE_MESH", "${options.sceneMesh}"
    buildConfigField "boolean", "PICO_SENSE_CONTROLLER", "${options.picoSenseController}"
    buildConfigField "boolean", "PICO_MOTION_TRACKER", "${options.motionTracker}"
    buildConfigField "boolean", "PICO_CONTROLLER_HAPTICS", "${options.controllerHaptics}"
    buildConfigField "boolean", "PICO_OPENXR_LOADER", "${options.openXrLoaderDeclaration}"
    buildConfigField "boolean", "PICO_NDK_ABI_FILTERS", "${options.ndkAbiFilters}"
    buildConfigField "boolean", "PICO_DEVELOPER_TOOLS", "${options.developerTools}"
    buildConfigField "boolean", "PICO_ENTITLEMENT_CHECK", "${options.entitlementCheck}"
    buildConfigField "String", "PICO_REFRESH_RATES", picoRefreshRatesValue
    buildConfigField "String", "PICO_TARGET_DEVICES", picoTargetDevicesValue
}
`;
            contents = contents + '\n' + buildConfigBlock;
        }
        // Separate marker from PICO_SDK_MARKER so an already-prebuilt project
        // picks this block up on the next incremental prebuild.
        if (options.buildVariant !== 'mobile' && !(0, utils_1.gradleContains)(contents, FLAVOR_XR_MODE_MARKER)) {
            contents = contents + '\n' + renderFlavorXrModeBlock(options);
        }
        config.modResults.contents = contents;
        return config;
    });
};
exports.withPicoAppBuildGradle = withPicoAppBuildGradle;
const withPicoProjectBuildGradle = (config, options) => {
    return (0, config_plugins_1.withProjectBuildGradle)(config, (config) => {
        let contents = config.modResults.contents;
        if (!(0, utils_1.gradleContains)(contents, PICO_REPO_MARKER)) {
            const allProjectsRepoPattern = /allprojects\s*\{\s*repositories\s*\{/;
            let result = (0, utils_1.insertAfterPattern)(contents, allProjectsRepoPattern, PICO_REPO_BLOCK);
            if (!result) {
                if (!contents.includes('allprojects')) {
                    contents += `
allprojects {
    repositories {
${PICO_REPO_BLOCK}
    }
}
`;
                }
                else {
                    console.warn('[expo-pico-core] Could not inject PICO Maven repo into project build.gradle. ' +
                        'You may need to add it manually: maven { url "${PICO_MAVEN_REPO}" }');
                }
            }
            else {
                contents = result;
            }
        }
        // Global `subprojects { missingDimensionStrategy 'device', 'mobile' }`
        // fallback. Without this, every autolinked module that doesn't declare
        // the `device` dimension fails to resolve under picoDebug/questDebug
        // (e.g. `:expo:questDebugCompileClasspath > Could not resolve project
        // :expo-pico-core`). The per-flavor strategy on the app module only
        // covers direct deps; this catches transitive autolinked modules.
        if (options.xrMode !== 'mobile' && !(0, utils_1.gradleContains)(contents, SUBPROJECT_MISSING_DIM_MARKER)) {
            contents += `
${SUBPROJECT_MISSING_DIM_MARKER}
subprojects { sub ->
    sub.plugins.withId("com.android.library") {
        sub.android {
            defaultConfig {
                missingDimensionStrategy 'device', 'mobile'
            }
        }
    }
}
`;
        }
        // Single-version pin for the PPS artifacts. `constraints` in the app
        // module only governs the app module; this reaches every other Gradle
        // module in the build, so an autolinked library that requests a PPS
        // coordinate resolves to the version the app actually packages
        // instead of putting a second copy of the SDK on the classpath.
        if (options.xrMode !== 'mobile' && !(0, utils_1.gradleContains)(contents, PPS_PIN_MARKER)) {
            contents += (0, ppsArtifacts_1.renderPpsResolutionPin)(PPS_PIN_MARKER);
        }
        config.modResults.contents = contents;
        return config;
    });
};
exports.withPicoProjectBuildGradle = withPicoProjectBuildGradle;
exports.default = {
    withPicoAppBuildGradle: exports.withPicoAppBuildGradle,
    withPicoProjectBuildGradle: exports.withPicoProjectBuildGradle,
};
//# sourceMappingURL=withPicoGradle.js.map