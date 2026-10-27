// React Native autolinking: the app's settings.gradle and PackageList pick up
// this package's Android module and ExpoPicoAchievementsPackage, which loads the
// Nitro library. Android only.
module.exports = {
  dependency: {
    platforms: {
      android: {
        packageImportPath:
          'import com.margelo.nitro.expopico.achievements.ExpoPicoAchievementsPackage;',
        packageInstance: 'new ExpoPicoAchievementsPackage()',
      },
      ios: null,
    },
  },
};
