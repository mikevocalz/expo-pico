import { ConfigPlugin, withAppBuildGradle, withProjectBuildGradle } from '@expo/config-plugins';

import { PICO_MAVEN_REPO, PICO_PLATFORM_SDK_GROUP, PICO_SDK_GROUP } from './constants';
import type { ResolvedPicoOptions } from './types';
import { resolveTargetProfile } from './types';
import { gradleContains, insertAfterPattern } from './utils';

const FLAVOR_MARKER = '// expo-pico-core: flavor dimensions';
const MISSING_DIM_MARKER = '// expo-pico-core: missing dimension strategy';
const PICO_SDK_MARKER = '// expo-pico-core: pico sdk config';
const PICO_REPO_MARKER = '// expo-pico-core: pico maven repo';
const HERMES_PATH_MARKER = '// expo-pico-core: hermesc path compatibility';
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
`;

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
        const dualFlavor = options.buildVariant === 'dual'
          ? `
        dual {
            dimension "device"
            minSdkVersion ${options.minSdkVersion}
            targetSdkVersion ${options.targetSdkVersion}
        }`
          : '';

        const flavorBlock = `
    ${FLAVOR_MARKER}
    flavorDimensions += "device"
    productFlavors {
        mobile { dimension "device" }
        pico {
            dimension "device"
            minSdkVersion ${options.minSdkVersion}
            targetSdkVersion ${options.targetSdkVersion}
        }${dualFlavor}
    }
`;
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

    if (!gradleContains(contents, PICO_SDK_MARKER)) {
      const emulatorFlag = options.enableEmulatorOptimizations ? 'true' : 'false';
      const buildConfigBlock = `
${PICO_SDK_MARKER}
def picoAppIdValue = "\\"${options.picoAppId ?? ''}\\""
def picoSpatialModeValue = "\\"${options.spatialMode}\\""
def picoTargetProfileValue = "\\"${effectiveProfile}\\""
def picoContainerModeValue = "\\"${options.defaultContainerMode}\\""
def picoXrModeValue = "\\"${options.xrMode}\\""

android.defaultConfig {
    buildConfigField "String", "PICO_APP_ID", picoAppIdValue
    buildConfigField "String", "PICO_SPATIAL_MODE", picoSpatialModeValue
    buildConfigField "String", "PICO_TARGET_PROFILE", picoTargetProfileValue
    buildConfigField "String", "PICO_CONTAINER_MODE", picoContainerModeValue
    buildConfigField "String", "PICO_XR_MODE", picoXrModeValue
    buildConfigField "boolean", "PICO_EMULATOR_OPTIMIZATIONS", "${emulatorFlag}"
}
`;
      contents = contents + '\n' + buildConfigBlock;
    }

    config.modResults.contents = contents;
    return config;
  });
};

export const withPicoProjectBuildGradle: ConfigPlugin<ResolvedPicoOptions> = (config, _options) => {
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

    config.modResults.contents = contents;
    return config;
  });
};

export default {
  withPicoAppBuildGradle,
  withPicoProjectBuildGradle,
};
