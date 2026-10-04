"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradleContains = gradleContains;
exports.insertAfterPattern = insertAfterPattern;
exports.getMainApplication = getMainApplication;
exports.getManifestRoot = getManifestRoot;
exports.ensureArray = ensureArray;
exports.hasMetaData = hasMetaData;
exports.upsertMetaData = upsertMetaData;
exports.addUsesFeature = addUsesFeature;
/**
 * Checks if a Gradle file already contains a specific string.
 * Used for idempotency — prevents duplicate injection.
 */
function gradleContains(contents, marker) {
    return contents.includes(marker);
}
/**
 * Inserts a block of text immediately after the first match of `afterPattern` in `source`.
 * Returns null if the pattern is not found.
 */
function insertAfterPattern(source, afterPattern, insertion) {
    const match = source.match(afterPattern);
    if (!match || match.index === undefined) {
        return null;
    }
    const insertPos = match.index + match[0].length;
    return source.slice(0, insertPos) + insertion + source.slice(insertPos);
}
/**
 * Safely retrieves the main <application> node from a parsed AndroidManifest.
 */
function getMainApplication(config) {
    return config.modResults.manifest?.application?.[0] ?? null;
}
/**
 * Safely retrieves the <manifest> root node from a parsed AndroidManifest.
 */
function getManifestRoot(config) {
    return config.modResults.manifest ?? null;
}
/**
 * Ensures an array property exists on a manifest node.
 */
function ensureArray(node, key) {
    if (!node[key]) {
        node[key] = [];
    }
    return node[key];
}
/**
 * Checks if a meta-data entry with the given android:name already exists.
 */
function hasMetaData(metaDataArray, name) {
    return metaDataArray.some((entry) => entry.$?.['android:name'] === name);
}
/**
 * Adds or updates a meta-data entry. Idempotent — will not duplicate.
 */
function upsertMetaData(metaDataArray, name, value) {
    const existing = metaDataArray.find((entry) => entry.$?.['android:name'] === name);
    if (existing) {
        existing.$['android:value'] = value;
    }
    else {
        metaDataArray.push({
            $: {
                'android:name': name,
                'android:value': value,
            },
        });
    }
}
/**
 * Adds a uses-feature entry if not already present. Idempotent.
 */
function addUsesFeature(featuresArray, name, required = true) {
    const exists = featuresArray.some((entry) => entry.$?.['android:name'] === name);
    if (!exists) {
        featuresArray.push({
            $: {
                'android:name': name,
                'android:required': String(required),
            },
        });
    }
}
//# sourceMappingURL=utils.js.map