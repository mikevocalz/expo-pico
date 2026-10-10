"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveQuestOptions = exports.QUEST_OPTION_NAMES = void 0;
const types_1 = require("./types");
const withMetaEntryRemovals_1 = require("./withMetaEntryRemovals");
const withQuestGradle_1 = require("./withQuestGradle");
const withQuestMetaLayout_1 = require("./withQuestMetaLayout");
const withQuestRemovals_1 = require("./withQuestRemovals");
const withQuestRenderModel_1 = require("./withQuestRenderModel");
const withQuestRendererOverlay_1 = require("./withQuestRendererOverlay");
const withQuestStoreDeviceTargets_1 = require("./withQuestStoreDeviceTargets");
/**
 * Meta Horizon quest-flavor extras: flavor settings, Meta VR Layout SDK
 * wiring, quest-only removals, Store device targets, the Viro renderer
 * overlay, and Meta entries kept out of the mobile flavor. Runs after the upstream expo-horizon-core plugin, which owns the
 * flavor and its manifest.
 */
const withHorizonQuest = (config, rawOptions) => {
    const options = (0, types_1.resolveQuestOptions)(rawOptions ?? {});
    config = (0, withQuestGradle_1.withQuestGradle)(config, options);
    config = (0, withQuestMetaLayout_1.withQuestMetaLayout)(config, options);
    config = (0, withQuestRemovals_1.withQuestRemovals)(config, options);
    config = (0, withQuestRendererOverlay_1.withQuestRendererOverlay)(config, options);
    config = (0, withQuestRenderModel_1.withQuestRenderModel)(config, options);
    config = (0, withQuestStoreDeviceTargets_1.withQuestStoreDeviceTargets)(config, options);
    return (0, withMetaEntryRemovals_1.withMetaEntryRemovals)(config);
};
exports.default = withHorizonQuest;
var types_2 = require("./types");
Object.defineProperty(exports, "QUEST_OPTION_NAMES", { enumerable: true, get: function () { return types_2.QUEST_OPTION_NAMES; } });
Object.defineProperty(exports, "resolveQuestOptions", { enumerable: true, get: function () { return types_2.resolveQuestOptions; } });
//# sourceMappingURL=index.js.map