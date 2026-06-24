import { ConfigPlugin, withAppBuildGradle, withProjectBuildGradle } from '@expo/config-plugins';

import {
  PICO_FLAVOR_ABI_FILTERS,
  PICO_MAVEN_REPO,
  PICO_PLATFORM_SDK_GROUP,
  PICO_SDK_GROUP,
} from './constants';
import type { ResolvedPicoOptions } from './types';
import { resolveTargetProfile } from './types';
import { gradleContains, insertAfterPattern } from './utils';

const FLAVOR_MARKER = '// expo-pico-core: flavor dimensions';
const MISSING_DIM_MARKER = '// expo-pico-core: missing dimension strategy';
const PICO_SDK_MARKER = '// expo-pico-core: pico sdk config';
const PICO_REPO_MARKER = '// expo-pico-core: pico maven repo';
const HERMES_PATH_MARKER = '// expo-pico-core: hermesc path compatibility';
const PACKAGING_PICK_FIRST_MARKER = '// expo-pico-core: 16KB openxr loader overlay';
const SUBPROJECT_MISSING_DIM_MARKER = '// expo-pico-core: subprojects missing-dim fallback';
const APP_LIBS_AAR_MARKER = '// expo-pico-core: auto-include app/libs/*.aar (PICO Platform SDK)';
const PPS_DEPS_MARKER = '// expo-pico-core: PICO Platform Service SDK (com.pico.pps:*) deps';

/**
 * PICO Platform Service SDK (PPS) — public maven artifacts.
 *
 * Confirmed live at `https://artifact.bytedance.com/repository/Volcengine/`
 * (the maven repo this plugin already registers via withPicoProjectBuildGradle).
 * Direct file paths are publicly readable — browsing returns 403 but
 * resolving specific (group, artifact, version) tuples succeeds.
 *
 * Version `1.0.0` is the current stable line. Bump the constant when PICO
 * publishes a new stable; pinning here keeps consumer apps reproducible.
 */
const PPS_PLATFORM_VERSION = '1.0.0';
const PPS_SERVICES = [
  'auth',          // expo-pico-account — PicoSignInClient
  'iap',           // expo-pico-iap — PicoIapClient
  'friend',        // expo-pico-rooms / -social shared
  'social',        // expo-pico-social
  'achievement',   // expo-pico-achievements
  'leaderboard',   // expo-pico-leaderboards
  'push',          // expo-pico-notifications
  'entitlement',
  'compliance',
  'sport',
  'speech',
];

const LEGACY_HERMES_PATH_PATTERN =
  /\n\s*hermesCommand\s*=.*\/sdks\/hermesc\/%OS-BIN%\/hermesc"\n/;
const HERMES_COMMENT_ONLY_PATTERN =
  /\n\s*\/\/ expo-pico-core: hermesc path compatibility\n\s*\/\/ Let the React Native Gradle plugin resolve hermesc for the installed RN version\.\n/;
const ANY_HERMES_COMMAND_PATTERN = /^\s*hermesCommand\s*=.*$/m;
const HERMES_COMPAT_BLOCK = `
    ${HERMES_PATH_MARKER}
    hermesCommand = new File([nodeBin, "--print", "require.resolve('hermes-compiler/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/hermesc/%OS-BIN%/hermesc"
`;

const PICO_REPO_BLOCK = `
        ${PICO_REPO_MARKER}
        maven {
            url "${PICO_MAVEN_REPO}"
            content {
                includeGroup "${PICO_SDK_GROUP}"
                includeGroup "${PICO_PLATFORM_SDK_GROUP}"
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
 * Phase E: the `pico` (and `dual`) flavors get `ndk { abiFilters 'arm64-v8a' }`
 * when `options.ndkAbiFilters` is true. PICO 4 / 4 Ultra / Swan are all
 * 64-bit ARM. Renderer-agnostic — same filter whether the app renders
 * with `@reactvision/react-viro`, Unity-as-a-Library, or any other
 * Android-side renderer.
 *
 * The `mobile` flavor is deliberately never ABI-filtered so phone /
 * tablet builds keep whatever abiFilters the consuming app already set.
 */
export function renderFlavorBlock(options: ResolvedPicoOptions): string {
  const abiFiltersLine = options.ndkAbiFilters
    ? `\n            ndk { abiFilters ${PICO_FLAVOR_ABI_FILTERS.map((a) => `'${a}'`).join(', ')} }`
    : '';

  const dualFlavor = options.buildVariant === 'dual'
    ? `
        dual {
            dimension "device"
            minSdkVersion ${options.minSdkVersion}
            targetSdkVersion ${options.targetSdkVersion}${abiFiltersLine}
        }`
    : '';

  // Quest flavor co-exists with pico when expo-horizon-core is installed
  // alongside us — it declares its own (mobile, quest) device variants and
  // would otherwise fail to resolve under the picoDebug build. The
  // missingDimensionStrategy lets pico fall back to expo-horizon-core's
  // mobile variant (its Quest-specific bits are no-op on PICO by design).
  // Symmetric: quest falls back to our mobile flavor.
  const questFlavor = options.buildVariant === 'pico' || options.buildVariant === 'dual'
    ? `
        quest {
            dimension "device"
            minSdkVersion 29
            targetSdkVersion ${options.targetSdkVersion}${abiFiltersLine}
            missingDimensionStrategy 'device', 'mobile'
        }`
    : '';

  const picoMissingDimensionLine = options.buildVariant === 'pico' || options.buildVariant === 'dual'
    ? `
            missingDimensionStrategy 'device', 'mobile'`
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
        }${dualFlavor}${questFlavor}
    }
`;
}

export const withPicoAppBuildGradle: ConfigPlugin<ResolvedPicoOptions> = (config, options) => {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const effectiveProfile = resolveTargetProfile(options);

    if (LEGACY_HERMES_PATH_PATTERN.test(contents)) {
      contents = contents.replace(LEGACY_HERMES_PATH_PATTERN, HERMES_COMPAT_BLOCK);
    } else if (HERMES_COMMENT_ONLY_PATTERN.test(contents)) {
      contents = contents.replace(HERMES_COMMENT_ONLY_PATTERN, HERMES_COMPAT_BLOCK);
    } else if (!gradleContains(contents, HERMES_PATH_MARKER) && !ANY_HERMES_COMMAND_PATTERN.test(contents)) {
      const result = insertAfterPattern(contents, /reactNativeDir\s*=.*\n/, HERMES_COMPAT_BLOCK);
      if (result) {
        contents = result;
      }
    }

    if (options.buildVariant === 'pico' || options.buildVariant === 'dual') {
      if (!gradleContains(contents, FLAVOR_MARKER)) {
        const flavorBlock = renderFlavorBlock(options);
        const result = insertAfterPattern(contents, /android\s*\{/, flavorBlock);
        if (result) {
          contents = result;
        } else {
          console.warn('[expo-pico-core] Could not find android {} block in app/build.gradle');
        }
      }
    } else {
      if (!gradleContains(contents, MISSING_DIM_MARKER)) {
        const dimStrategyBlock = `
    ${MISSING_DIM_MARKER}
    defaultConfig {
        missingDimensionStrategy "device", "mobile"
    }
`;
        const result = insertAfterPattern(contents, /android\s*\{/, dimStrategyBlock);
        if (result) {
          contents = result;
        } else {
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
    // Consumers don't need to drop any AAR files — Gradle pulls each
    // service from maven on first build. The legacy AAR-drop fallback
    // below stays in place for offline / air-gapped builds.
    if (
      options.xrMode !== 'mobile' &&
      !gradleContains(contents, PPS_DEPS_MARKER)
    ) {
      const lines = PPS_SERVICES.map(
        (svc) => `    implementation "com.pico.pps:platform-service-${svc}:${PPS_PLATFORM_VERSION}"`
      ).join('\n');
      const ppsDepsBlock = `
${PPS_DEPS_MARKER}
dependencies {
${lines}
}
`;
      contents = contents + '\n' + ppsDepsBlock;
    }

    // PICO Platform SDK AAR drop-in (offline fallback). Consumers who
    // need to vendor the AARs into source control (air-gapped CI, etc.)
    // can drop them into android/app/libs/. This block picks up anything
    // there without further build.gradle edits.
    if (
      options.xrMode !== 'mobile' &&
      !gradleContains(contents, APP_LIBS_AAR_MARKER)
    ) {
      const libsBlock = `
${APP_LIBS_AAR_MARKER}
dependencies {
    implementation fileTree(dir: 'libs', include: ['*.aar', '*.jar'])
}
`;
      contents = contents + '\n' + libsBlock;
    }

    // 16KB ELF alignment for libopenxr_loader.so. Viro 2.56.0 ships a
    // 4KB-aligned Khronos loader (1.1.38); PICO OS 6 / Android 14+ rejects
    // it. withPicoOpenXrLoaderOverlay drops a 16KB-aligned copy into
    // app/src/main/jniLibs/; we pickFirst so it wins over the AAR's.
    if (
      options.xrMode !== 'mobile' &&
      !gradleContains(contents, PACKAGING_PICK_FIRST_MARKER)
    ) {
      const pickFirstBlock = `
    ${PACKAGING_PICK_FIRST_MARKER}
    packagingOptions {
        jniLibs {
            pickFirsts += ["**/libopenxr_loader.so"]
        }
    }
`;
      const result = insertAfterPattern(contents, /android\s*\{/, pickFirstBlock);
      if (result) {
        contents = result;
      }
    }

    if (!gradleContains(contents, PICO_SDK_MARKER)) {
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
    // Phase K — capability declarations exposed at runtime so JS code can
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

    config.modResults.contents = contents;
    return config;
  });
};

export const withPicoProjectBuildGradle: ConfigPlugin<ResolvedPicoOptions> = (config, options) => {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!gradleContains(contents, PICO_REPO_MARKER)) {
      const allProjectsRepoPattern = /allprojects\s*\{\s*repositories\s*\{/;
      let result = insertAfterPattern(contents, allProjectsRepoPattern, PICO_REPO_BLOCK);

      if (!result) {
        if (!contents.includes('allprojects')) {
          contents += `
allprojects {
    repositories {
${PICO_REPO_BLOCK}
    }
}
`;
        } else {
          console.warn(
            '[expo-pico-core] Could not inject PICO Maven repo into project build.gradle. ' +
              'You may need to add it manually: maven { url "${PICO_MAVEN_REPO}" }'
          );
        }
      } else {
        contents = result;
      }
    }

    // Global `subprojects { missingDimensionStrategy 'device', 'mobile' }`
    // fallback. Without this, every autolinked module that doesn't declare
    // the `device` dimension fails to resolve under picoDebug/questDebug
    // (e.g. `:expo:questDebugCompileClasspath > Could not resolve project
    // :expo-pico-core`). The per-flavor strategy on the app module only
    // covers direct deps; this catches transitive autolinked modules.
    if (
      options.xrMode !== 'mobile' &&
      !gradleContains(contents, SUBPROJECT_MISSING_DIM_MARKER)
    ) {
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

    config.modResults.contents = contents;
    return config;
  });
};

export default {
  withPicoAppBuildGradle,
  withPicoProjectBuildGradle,
};
