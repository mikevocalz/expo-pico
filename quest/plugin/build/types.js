"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEST_OPTION_NAMES = void 0;
exports.resolveQuestOptions = resolveQuestOptions;
const withQuestRemovals_1 = require("./withQuestRemovals");
const withQuestStoreDeviceTargets_1 = require("./withQuestStoreDeviceTargets");
/** The {@linkcode QuestOptions} keys, for splitting a combined plugin entry. */
exports.QUEST_OPTION_NAMES = [
    'metaLayoutSdk',
    'storeDeviceTargets',
    'questRemovePermissions',
    'questRemoveFeatures',
    'questExcludeDependencies',
    'viroRendererOverlay',
    'ndkAbiFilters',
];
/**
 * Validates {@linkcode QuestOptions} and fills defaults.
 *
 * @throws when `storeDeviceTargets` or `questExcludeDependencies` holds a
 * value Meta or Gradle would reject
 */
function resolveQuestOptions(options = {}) {
    return {
        metaLayoutSdk: options.metaLayoutSdk === true,
        storeDeviceTargets: (0, withQuestStoreDeviceTargets_1.normalizeStoreDeviceTargets)(options.storeDeviceTargets),
        questRemovePermissions: (0, withQuestRemovals_1.normalizeNames)(options.questRemovePermissions),
        questRemoveFeatures: (0, withQuestRemovals_1.normalizeNames)(options.questRemoveFeatures),
        questExcludeDependencies: (0, withQuestRemovals_1.normalizeDependencyExclusions)(options.questExcludeDependencies),
        viroRendererOverlay: options.viroRendererOverlay === true,
        ndkAbiFilters: options.ndkAbiFilters !== false,
    };
}
//# sourceMappingURL=types.js.map