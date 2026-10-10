import type { ConfigPlugin } from '@expo/config-plugins';
import type { QuestOptions } from './types';
/**
 * Meta Horizon quest-flavor extras: flavor settings, Meta VR Layout SDK
 * wiring, quest-only removals, Store device targets, the Viro renderer
 * overlay, and Meta entries kept out of the mobile flavor. Runs after the upstream expo-horizon-core plugin, which owns the
 * flavor and its manifest.
 */
declare const withHorizonQuest: ConfigPlugin<QuestOptions | void>;
export default withHorizonQuest;
export { QUEST_OPTION_NAMES, resolveQuestOptions } from './types';
export type { QuestOptions, ResolvedQuestOptions } from './types';
//# sourceMappingURL=index.d.ts.map