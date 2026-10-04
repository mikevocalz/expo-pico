"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPicoSpatialProjectBuildGradle = void 0;
const config_plugins_1 = require("@expo/config-plugins");
const SPATIAL_TOOLS_MARKER = '// expo-pico-spatial: spatial tools version';
/**
 * Injects `spatialToolsVersion` into the project-level build.gradle's
 * `buildscript { ext { } }` block. Required by the PICO Spatial Tools SDK
 * Gradle plugin at build time.
 *
 * If no `buildscript` block exists, one is prepended to the file.
 * If `buildscript` exists but has no `ext`, the ext block is inserted.
 * If both exist, the property is appended inside `ext`.
 */
const withPicoSpatialProjectBuildGradle = (config, options) => {
    return (0, config_plugins_1.withProjectBuildGradle)(config, (config) => {
        let contents = config.modResults.contents;
        if (contents.includes(SPATIAL_TOOLS_MARKER)) {
            config.modResults.contents = contents;
            return config;
        }
        const versionLine = `spatialToolsVersion = "${options.spatialToolsVersion}"`;
        const markerAndVersion = `${SPATIAL_TOOLS_MARKER}\n        ${versionLine}`;
        // Case 1: buildscript { ext { ... } } already exists
        const buildscriptExtPattern = /(buildscript\s*\{[^}]*?ext\s*\{)/s;
        const extMatch = contents.match(buildscriptExtPattern);
        if (extMatch && extMatch.index !== undefined) {
            const insertPos = extMatch.index + extMatch[0].length;
            const before = contents.slice(0, insertPos);
            const after = contents.slice(insertPos);
            contents = before + '\n        ' + markerAndVersion + after;
            config.modResults.contents = contents;
            return config;
        }
        // Case 2: buildscript { } exists but no ext block
        const buildscriptPattern = /buildscript\s*\{/;
        const bsMatch = contents.match(buildscriptPattern);
        if (bsMatch && bsMatch.index !== undefined) {
            const insertPos = bsMatch.index + bsMatch[0].length;
            const extBlock = '\n    ext {\n        ' + markerAndVersion + '\n    }';
            const before = contents.slice(0, insertPos);
            const after = contents.slice(insertPos);
            contents = before + extBlock + after;
            config.modResults.contents = contents;
            return config;
        }
        // Case 3: no buildscript block at all — prepend one
        const block = 'buildscript {\n    ext {\n        ' + markerAndVersion + '\n    }\n}\n\n';
        contents = block + contents;
        config.modResults.contents = contents;
        return config;
    });
};
exports.withPicoSpatialProjectBuildGradle = withPicoSpatialProjectBuildGradle;
//# sourceMappingURL=withPicoSpatialGradle.js.map