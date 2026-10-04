"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPicoSpatialSdkRuntime = exports.SPATIAL_SDK_VERSION = void 0;
exports.renderSpatialSdkRuntimeBlock = renderSpatialSdkRuntimeBlock;
const config_plugins_1 = require("@expo/config-plugins");
exports.SPATIAL_SDK_VERSION = '6.1.9';
const SPATIAL_SDK_RUNTIME_MARKER = '// expo-pico-spatial: PICO Spatial SDK runtime';
/**
 * Gradle appended to app/build.gradle when `enableSpatialSdk` is true.
 *
 * Only `core` is declared; its POM brings `foundation` at the same version.
 * It goes on the pico and dual flavor configurations, whichever exist, so the
 * mobile and quest APKs never carry it. The repo filter covers just the two
 * Spatial groups, because the project-level Volcengine repo that
 * expo-pico-core registers is filtered to com.pico.pps and com.pico.
 */
function renderSpatialSdkRuntimeBlock(version = exports.SPATIAL_SDK_VERSION) {
    return `
${SPATIAL_SDK_RUNTIME_MARKER}
//
// Linking this marks the app as a spatial app on PICO OS 6 (the core AAR's
// manifest sets pico.spatial.isspatial=1). On PICO OS 5 the bridge sees
// SpatialBuild.isSpatialPlatform() == false and every call returns false.
repositories {
    maven {
        url "https://artifact.bytedance.com/repository/Volcengine/"
        content {
            includeGroup "com.pico.spatial.core"
            includeGroup "com.pico.spatial.foundation"
        }
    }
}

def picoSpatialSdkConfigurations = ["picoImplementation", "dualImplementation"].findAll {
    project.configurations.findByName(it) != null
}
if (picoSpatialSdkConfigurations.isEmpty()) {
    logger.warn("[expo-pico-spatial] enableSpatialSdk is set but there is no pico or dual flavor; the PICO Spatial SDK was not added.")
}
dependencies {
    picoSpatialSdkConfigurations.each { configuration ->
        add(configuration, "com.pico.spatial.core:core:${version}")
    }
}
`;
}
const withPicoSpatialSdkRuntime = (config) => (0, config_plugins_1.withAppBuildGradle)(config, (config) => {
    if (!config.modResults.contents.includes(SPATIAL_SDK_RUNTIME_MARKER)) {
        config.modResults.contents += renderSpatialSdkRuntimeBlock();
    }
    return config;
});
exports.withPicoSpatialSdkRuntime = withPicoSpatialSdkRuntime;
//# sourceMappingURL=withPicoSpatialSdkRuntime.js.map