"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withQuestGradle = void 0;
exports.findQuestDependenciesBlock = findQuestDependenciesBlock;
exports.updateQuestFlavorBlock = updateQuestFlavorBlock;
exports.updateQuestProjectGradle = updateQuestProjectGradle;
const config_plugins_1 = require("@expo/config-plugins");
const withQuestMetaLayout_1 = require("./withQuestMetaLayout");
const QUEST_FLAVOR_BEGIN = '// expo-horizon-quest: begin quest flavor';
const QUEST_FLAVOR_END = '// expo-horizon-quest: end quest flavor';
// Same marker text the PICO plugin uses, so a project with both gets one copy.
const SUBPROJECT_MISSING_DIM_MARKER = '// expo-pico-core: subprojects missing-dim fallback';
const HORIZON_BUILD_CONFIG_MARKER = '// expo-pico-core: Expo Horizon AGP 9 BuildConfig compatibility';
/** A `quest` flavor configuration, such as `questImplementation` or `questDebugApi`. */
const QUEST_CONFIGURATION = /\bquest(?:Debug|Release)?(?:Implementation|Api|CompileOnly|RuntimeOnly)\b/;
/**
 * Start of the line that opens the first top-level `dependencies { ... }`
 * block calling a quest configuration, or -1. A `dependencies` block nested in
 * `buildscript` (indented or not) never matches, and braces inside strings and
 * comments do not count, so generated Gradle with braces in text still scans
 * correctly.
 */
function findQuestDependenciesBlock(contents) {
    let depth = 0;
    let state = 'code';
    let quote = '';
    let lineStart = 0;
    let open = -1;
    for (let index = 0; index < contents.length; index += 1) {
        const char = contents[index];
        const next = contents[index + 1];
        if (char === '\n') {
            lineStart = index + 1;
            if (state === 'line')
                state = 'code';
            if (state !== 'quote' && state !== 'triple')
                continue;
        }
        if (state === 'line')
            continue;
        if (state === 'block') {
            if (char === '*' && next === '/') {
                state = 'code';
                index += 1;
            }
            continue;
        }
        if (state === 'quote') {
            if (char === '\\')
                index += 1;
            else if (char === quote)
                state = 'code';
            continue;
        }
        if (state === 'triple') {
            if (contents.startsWith(quote.repeat(3), index)) {
                state = 'code';
                index += 2;
            }
            continue;
        }
        if (char === '/' && next === '/') {
            state = 'line';
            index += 1;
            continue;
        }
        if (char === '/' && next === '*') {
            state = 'block';
            index += 1;
            continue;
        }
        if (char === "'" || char === '"') {
            quote = char;
            const triple = contents.startsWith(char.repeat(3), index);
            state = triple ? 'triple' : 'quote';
            if (triple)
                index += 2;
            continue;
        }
        if (depth === 0 &&
            (index === lineStart || contents.slice(lineStart, index).trim() === '') &&
            /^dependencies[ \t]*\{/.test(contents.slice(index, index + 32))) {
            open = lineStart;
        }
        if (char === '{') {
            depth += 1;
        }
        else if (char === '}') {
            depth = Math.max(0, depth - 1);
            if (depth === 0 && open !== -1) {
                if (QUEST_CONFIGURATION.test(contents.slice(open, index)))
                    return open;
                open = -1;
            }
        }
    }
    return -1;
}
/**
 * The quest flavor's settings, rewritten on every prebuild. Gradle must create
 * `questImplementation` before evaluating any dependency that calls it, so the
 * block goes above the Meta Layout SDK block and above a top-level
 * `dependencies` block that already uses a quest configuration
 * ({@linkcode findQuestDependenciesBlock}); otherwise it is appended.
 *
 * expo-horizon-core declares `mobile` and `quest` only when the file has no
 * flavors yet; when another plugin declared the `device` dimension first
 * (PICO), it skips. Declaring `quest` here keeps the flavor in both cases.
 * The block never mentions `flavorDimensions`, so expo-horizon-core's own
 * check still adds the dimension when nothing else did.
 *
 * Gradle creates `questImplementation` when the `quest` flavor is declared,
 * so the flavor has to come before the Meta Layout SDK block that calls it
 * (`withQuestMetaLayout`). Expo runs the two mods in reverse registration
 * order, so this places the flavor above that block whenever the block is
 * already in the file, instead of relying on which mod ran first.
 */
function updateQuestFlavorBlock(contents, options) {
    contents = contents.replace(new RegExp(`\\n${escape(QUEST_FLAVOR_BEGIN)}[\\s\\S]*?${escape(QUEST_FLAVOR_END)}\\n?`, 'g'), '');
    const abi = options.ndkAbiFilters ? `\n            ndk { abiFilters 'arm64-v8a' }` : '';
    const pickFirst = options.viroRendererOverlay
        ? `
androidComponents {
    onVariants(selector().all()) { variant ->
        if (variant.productFlavors.any { it.first == "device" && it.second == "quest" }) {
            variant.packaging.jniLibs.pickFirsts.addAll(["**/libviro_renderer.so"])
        }
    }
}`
        : '';
    const block = `
${QUEST_FLAVOR_BEGIN}
android {
    productFlavors {
        quest {
            dimension "device"
            minSdkVersion 29
            matchingFallbacks = ['mobile']${abi}
        }
    }
}${pickFirst}
${QUEST_FLAVOR_END}
`;
    // The flavor must precede every quest configuration call: the Meta Layout
    // SDK block (withQuestMetaLayout) and any top-level `dependencies` block
    // that already calls `questImplementation` and friends. When PICO declares
    // the `device` dimension first, expo-horizon-core skips declaring Quest, so
    // appending the flavor after either is too late. With neither present the
    // flavor is appended and the rest of the file stays as it was.
    const anchors = [
        contents.indexOf(withQuestMetaLayout_1.META_LAYOUT_GRADLE_MARKER),
        findQuestDependenciesBlock(contents),
    ].filter((index) => index !== -1);
    if (anchors.length === 0)
        return contents + block;
    const anchor = Math.min(...anchors);
    const lineStart = contents.lastIndexOf('\n', anchor - 1) + 1;
    return (contents.slice(0, lineStart).replace(/\n*$/, '\n') +
        block.slice(1) +
        '\n' +
        contents.slice(lineStart));
}
/**
 * Project-level fixes the quest flavor needs: expo-horizon-core 57.0.2 reads
 * a BuildConfig field AGP 9 no longer generates by default, and autolinked
 * modules without the `device` dimension need a fallback to resolve flavored
 * libraries under questDebug.
 */
function updateQuestProjectGradle(contents) {
    if (!contents.includes(HORIZON_BUILD_CONFIG_MARKER)) {
        contents += `
${HORIZON_BUILD_CONFIG_MARKER}
subprojects { sub ->
    if (sub.name == "expo-horizon-core") {
        sub.plugins.withId("com.android.library") {
            sub.android.buildFeatures.buildConfig = true
        }
    }
}
`;
    }
    if (!contents.includes(SUBPROJECT_MISSING_DIM_MARKER)) {
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
    return contents;
}
function escape(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/** Applies {@linkcode updateQuestFlavorBlock} and {@linkcode updateQuestProjectGradle}. */
const withQuestGradle = (config, options) => {
    config = (0, config_plugins_1.withAppBuildGradle)(config, (cfg) => {
        cfg.modResults.contents = updateQuestFlavorBlock(cfg.modResults.contents, options);
        return cfg;
    });
    return (0, config_plugins_1.withProjectBuildGradle)(config, (cfg) => {
        cfg.modResults.contents = updateQuestProjectGradle(cfg.modResults.contents);
        return cfg;
    });
};
exports.withQuestGradle = withQuestGradle;
//# sourceMappingURL=withQuestGradle.js.map