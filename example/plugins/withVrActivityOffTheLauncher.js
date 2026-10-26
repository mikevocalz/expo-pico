// @reactvision/react-viro 2.58.1 gives .VRActivity a MAIN +
// com.oculus.intent.category.VR intent-filter in the main manifest, so every
// flavor, quest included, lists the app twice in the headset library and
// @expo-pico/core's one-launcher-tile check fails the prebuild.
//
// VRLauncher starts VRActivity with an explicit intent, which needs no
// filter, so this drops every filter on it. Listed first in app.config.ts so
// its manifest mod runs after Viro's. Idempotent.
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withVrActivityOffTheLauncher(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    const application = manifestConfig.modResults.manifest.application?.[0];
    const vrActivity = application?.activity?.find(
      (entry) => entry.$?.['android:name'] === '.VRActivity'
    );
    if (vrActivity) delete vrActivity['intent-filter'];
    return manifestConfig;
  });
};
