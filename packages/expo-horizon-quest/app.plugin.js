// Quest-flavor extras only. In a release, the expo-horizon-core entry runs
// upstream first and then this plugin (see scripts/build-release-branches.mjs).
module.exports = require('./plugin/build').default;
