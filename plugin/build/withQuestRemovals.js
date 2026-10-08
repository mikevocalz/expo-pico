"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.withQuestRemovals = exports.QUEST_EXCLUSIONS_MARKER = void 0;
exports.normalizeDependencyExclusions = normalizeDependencyExclusions;
exports.normalizeNames = normalizeNames;
exports.applyQuestManifestRemovals = applyQuestManifestRemovals;
exports.syncQuestManifestRemovals = syncQuestManifestRemovals;
exports.renderQuestExclusionsBlock = renderQuestExclusionsBlock;
exports.stripQuestExclusionsBlock = stripQuestExclusionsBlock;
exports.applyQuestExclusionsGradle = applyQuestExclusionsGradle;
const config_plugins_1 = require("@expo/config-plugins");
// withFinalizedMod runs after every other mod, dangerous mods included.
// Imported via the deep path because some older @expo/config-plugins
// releases don't re-export it.
const finalizedModExports = require('@expo/config-plugins/build/plugins/withFinalizedMod');
const withFinalizedMod = finalizedModExports.withFinalizedMod;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const TOOLS_NS = 'http://schemas.android.com/tools';
exports.QUEST_EXCLUSIONS_MARKER = '// expo-pico-core: quest dependency exclusions';
const QUEST_EXCLUSIONS_END = '// expo-pico-core: end quest dependency exclusions';
/** `group:module` coordinates; throws on anything else. */
function normalizeDependencyExclusions(values) {
    const out = [];
    for (const raw of values ?? []) {
        const v = typeof raw === 'string' ? raw.trim() : '';
        const parts = v.split(':');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            throw new Error(`[expo-pico-core] questExcludeDependencies entries must be "group:module", got ${JSON.stringify(raw)}.`);
        }
        if (!out.includes(v))
            out.push(v);
    }
    return out;
}
/** Trims, drops blanks and duplicates, keeps order. */
function normalizeNames(values) {
    const out = [];
    for (const raw of values ?? []) {
        const v = typeof raw === 'string' ? raw.trim() : '';
        if (v && !out.includes(v))
            out.push(v);
    }
    return out;
}
/**
 * Adds a `tools:node="remove"` entry for each name under `tag`. An existing
 * entry for the name is turned into a removal rather than duplicated.
 */
function applyRemovals(root, tag, names) {
    if (names.length === 0)
        return;
    const entries = (root[tag] ?? []).slice();
    for (const name of names) {
        const hit = entries.filter((e) => e.$?.['android:name'] === name);
        if (hit.length === 0) {
            entries.push({ $: { 'android:name': name, 'tools:node': 'remove' } });
            continue;
        }
        hit[0].$ = { 'android:name': name, 'tools:node': 'remove' };
        for (const dup of hit.slice(1))
            entries.splice(entries.indexOf(dup), 1);
    }
    root[tag] = entries;
}
/** Applies the removals to a parsed quest manifest. Returns true when it changed. */
function applyQuestManifestRemovals(manifest, permissions, features) {
    if (permissions.length === 0 && features.length === 0)
        return false;
    const before = JSON.stringify(manifest);
    const root = manifest.manifest;
    root.$['xmlns:tools'] = root.$['xmlns:tools'] ?? TOOLS_NS;
    applyRemovals(root, 'uses-permission', permissions);
    applyRemovals(root, 'uses-feature', features);
    return JSON.stringify(manifest) !== before;
}
/**
 * Brings `app/src/quest/AndroidManifest.xml` in line with the options. The
 * quest manifest belongs to expo-horizon-core, so this never creates one.
 */
async function syncQuestManifestRemovals(platformRoot, options) {
    const questPath = path.join(platformRoot, 'app', 'src', 'quest', 'AndroidManifest.xml');
    if (!fs.existsSync(questPath))
        return;
    const manifest = await config_plugins_1.AndroidConfig.Manifest.readAndroidManifestAsync(questPath);
    if (!applyQuestManifestRemovals(manifest, options.questRemovePermissions, options.questRemoveFeatures)) {
        return;
    }
    await config_plugins_1.AndroidConfig.Manifest.writeAndroidManifestAsync(questPath, manifest);
}
function renderQuestExclusionsBlock(coordinates) {
    const lines = coordinates
        .map((c) => {
        const [group, module] = c.split(':');
        return `        c.exclude group: "${group}", module: "${module}"`;
    })
        .join('\n');
    return `${exports.QUEST_EXCLUSIONS_MARKER}
// Set by questExcludeDependencies. Quest classpaths only; every other flavor
// keeps these artifacts.
configurations.configureEach { c ->
    if (c.name.startsWith("quest") && (c.name.endsWith("CompileClasspath") || c.name.endsWith("RuntimeClasspath"))) {
${lines}
    }
}
${QUEST_EXCLUSIONS_END}
`;
}
function stripQuestExclusionsBlock(contents) {
    const start = contents.indexOf(exports.QUEST_EXCLUSIONS_MARKER);
    if (start === -1)
        return contents;
    const endMarker = contents.indexOf(QUEST_EXCLUSIONS_END, start);
    if (endMarker === -1)
        return contents;
    let end = endMarker + QUEST_EXCLUSIONS_END.length;
    if (contents[end] === '\n')
        end += 1;
    let from = start;
    if (from > 0 && contents[from - 1] === '\n')
        from -= 1;
    return contents.slice(0, from) + contents.slice(end);
}
/** Returns app/build.gradle with exactly one current block, or none. */
function applyQuestExclusionsGradle(contents, coordinates) {
    const stripped = stripQuestExclusionsBlock(contents);
    if (coordinates.length === 0)
        return stripped;
    return stripped.replace(/\n*$/, '\n\n') + renderQuestExclusionsBlock(coordinates);
}
const withQuestRemovals = (config, options) => {
    config = (0, config_plugins_1.withAppBuildGradle)(config, (cfg) => {
        if (cfg.modResults.language !== 'groovy') {
            if (options.questExcludeDependencies.length > 0) {
                console.warn('[expo-pico-core] questExcludeDependencies needs a Groovy app/build.gradle; skipping.');
            }
            return cfg;
        }
        cfg.modResults.contents = applyQuestExclusionsGradle(cfg.modResults.contents, options.questExcludeDependencies);
        return cfg;
    });
    // Finalized for the same reason as withQuestStoreDeviceTargets:
    // expo-horizon-core rewrites the quest manifest in a dangerous mod.
    return withFinalizedMod(config, [
        'android',
        async (cfg) => {
            await syncQuestManifestRemovals(cfg.modRequest.platformProjectRoot, options);
            return cfg;
        },
    ]);
};
exports.withQuestRemovals = withQuestRemovals;
//# sourceMappingURL=withQuestRemovals.js.map