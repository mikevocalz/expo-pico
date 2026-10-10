import type { ConfigPlugin } from '@expo/config-plugins';

import type { QuestOptions } from './types';
import { resolveQuestOptions } from './types';
import { withMetaEntryRemovals } from './withMetaEntryRemovals';
import { withQuestGradle } from './withQuestGradle';
import { withQuestMetaLayout } from './withQuestMetaLayout';
import { withQuestRemovals } from './withQuestRemovals';
import { withQuestRenderModel } from './withQuestRenderModel';
import { withQuestRendererOverlay } from './withQuestRendererOverlay';
import { withQuestStoreDeviceTargets } from './withQuestStoreDeviceTargets';

/**
 * Meta Horizon quest-flavor extras: flavor settings, Meta VR Layout SDK
 * wiring, quest-only removals, Store device targets, the Viro renderer
 * overlay, and Meta entries kept out of the mobile flavor. Runs after the upstream expo-horizon-core plugin, which owns the
 * flavor and its manifest.
 */
const withHorizonQuest: ConfigPlugin<QuestOptions | void> = (config, rawOptions) => {
  const options = resolveQuestOptions(rawOptions ?? {});
  config = withQuestGradle(config, options);
  config = withQuestMetaLayout(config, options);
  config = withQuestRemovals(config, options);
  config = withQuestRendererOverlay(config, options);
  config = withQuestRenderModel(config, options);
  config = withQuestStoreDeviceTargets(config, options);
  return withMetaEntryRemovals(config);
};

export default withHorizonQuest;
export { QUEST_OPTION_NAMES, resolveQuestOptions } from './types';
export type { QuestOptions, ResolvedQuestOptions } from './types';
