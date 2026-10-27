// React Native autolinking: the app's settings.gradle and PackageList pick up
// core's Android module (android/) and PicoCorePackage, which loads every
// installed @expo-pico Nitro library and starts the runtime that
// BuildConfig.PICO_XR_MODE names for the flavor being built. Core's Expo
// project (android-expo, from expo-module.config.json) is linked separately
// by Expo autolinking. Android only.
module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: 'android',
        packageImportPath: 'import expo.modules.pico.PicoCorePackage;',
        packageInstance: 'new PicoCorePackage()',
      },
      ios: null,
    },
  },
};
