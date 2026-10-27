// React Native autolinking: the app's settings.gradle and PackageList pick up
// this package's Android module and ExpoPicoRoomsPackage, which loads the
// Nitro library. Android only.
module.exports = {
  dependency: {
    platforms: {
      android: {
        packageImportPath: 'import com.margelo.nitro.expopico.rooms.ExpoPicoRoomsPackage;',
        packageInstance: 'new ExpoPicoRoomsPackage()',
      },
      ios: null,
    },
  },
};
