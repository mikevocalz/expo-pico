// expo-horizon-core as released from github:mikevocalz/expo-pico#release/horizon-core:
// the upstream npm plugin first, then the quest-flavor extras from
// packages/expo-horizon-quest. One plugin entry takes both sets of options.
const upstream = require('./plugin/build/withHorizon').default;
const quest = require('./quest/plugin/build');

module.exports = (config, props = {}) => {
  const upstreamProps = {};
  const questProps = {};
  for (const [key, value] of Object.entries(props ?? {})) {
    (quest.QUEST_OPTION_NAMES.includes(key) ? questProps : upstreamProps)[key] = value;
  }
  return quest.default(upstream(config, upstreamProps), questProps);
};
