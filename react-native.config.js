// React Native autolinking: the app's settings.gradle and PackageList pick up
// this package's Android module and ExpoPicoSpatialPackage, which loads the
// Nitro library. Android only.
module.exports = {
  dependency: {
    platforms: {
      android: {
        packageImportPath: 'import com.margelo.nitro.expopico.spatial.ExpoPicoSpatialPackage;',
        packageInstance: 'new ExpoPicoSpatialPackage()',
      },
      ios: null,
    },
  },
};
