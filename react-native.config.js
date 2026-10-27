// React Native autolinking: the app's settings.gradle and PackageList pick up
// this package's Android module and ExpoPicoLeaderboardsPackage, which loads the
// Nitro library. Android only.
module.exports = {
  dependency: {
    platforms: {
      android: {
        packageImportPath:
          'import com.margelo.nitro.expopico.leaderboards.ExpoPicoLeaderboardsPackage;',
        packageInstance: 'new ExpoPicoLeaderboardsPackage()',
      },
      ios: null,
    },
  },
};
