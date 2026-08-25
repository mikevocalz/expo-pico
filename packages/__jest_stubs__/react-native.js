/**
 * Minimal `react-native` stub for the Node test environment.
 *
 * The packages import react-native only for a couple of host APIs (AppRegistry,
 * Platform). Pulling the real module into a `testEnvironment: 'node'` run fails
 * on its ESM/Flow syntax, and adding a Babel/RN transform for two functions
 * would slow every suite down for no coverage gain.
 *
 * `registerComponent` records its calls so tests can assert registration
 * without a renderer.
 */
const registrations = new Map();

const AppRegistry = {
  registerComponent(name, componentProvider) {
    registrations.set(name, componentProvider);
    return name;
  },
  getAppKeys: () => [...registrations.keys()],
  __getRegistrations: () => registrations,
  __reset: () => registrations.clear(),
};

module.exports = {
  AppRegistry,
  Platform: { OS: 'android', select: (spec) => spec.android ?? spec.default },
  NativeModules: {},
};
