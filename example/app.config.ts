import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'expo-pico-example',
  slug: 'expo-pico-example',
  version: '1.0.0',
  scheme: 'expopico',
  orientation: 'default',
  newArchEnabled: true,
  // Bundle any GLB / glTF assets so the scene renderer can require() them.
  // See `assets/models/README.md` for which file the scene looks for.
  // Viro3DObject loads through `require()` resolved by expo-asset's Metro
  // transformer, so asset bundling is the right distribution path here.
  assetBundlePatterns: ['assets/**/*'],
  android: {
    package: 'com.example.expopico',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
  ios: {
    bundleIdentifier: 'com.example.expopico',
  },
  plugins: [
    // First, so its manifest mod runs after Viro's. See the file.
    './plugins/withVrActivityOffTheLauncher',
    'expo-router',
    // Meta Horizon / Quest build flavor + manifest (Software Mansion).
    // Creates the `quest` Android build flavor with the right
    // <uses-feature> + panel sizing + supportedDevices entries for the
    // Meta Horizon Store. Build with `npm run quest`.
    [
      'expo-horizon-core',
      {
        horizonAppId: process.env.HORIZON_APP_ID ?? '',
        // Meta's canonical identifiers (port-an-existing-app, 2026-09-14):
        // quest2, questpro, quest3, quest3s, vrglasses. This app targets the
        // Quest 3 family and Meta VR Glasses, matching `storeDeviceTargets:
        // 'quest3+'` below.
        supportedDevices: 'quest3|quest3s|vrglasses',
        // The launcher opens first as a 2D panel on MainActivity; the
        // immersive scene is a separate VRActivity. Horizon accepts panel
        // widths of 360-1280dp (the Meta VR Glasses range), so 1280x800dp
        // landscape is the widest panel that still fits there. Written to
        // app/src/quest/AndroidManifest.xml as
        // <layout android:defaultWidth="1280dp" android:defaultHeight="800dp"/>.
        // Keep `orientation: 'default'` above: a fixed orientation that
        // disagrees with these dimensions letterboxes the panel.
        defaultWidth: '1280dp',
        defaultHeight: '800dp',
        disableVrHeadtracking: false,
        allowBackup: false,
      },
    ],
    // ReactVision/Viro renderer. With the PICO config enabled it pairs with
    // expo-pico-core's openxr_loader declaration so the same JS runs immersive
    // on PICO (picoDebug) and Meta Quest (questDebug).
    [
      '@reactvision/react-viro',
      {
        // Must match expo-horizon-core's supportedDevices: both plugins write
        // com.oculus.supportedDevices and the manifest merger rejects a mismatch.
        android: { xRMode: ['QUEST', 'PICO'], questSupportedDevices: 'quest3|quest3s|vrglasses' },
      },
    ],
    // Quest-flavor extras for Quest and Meta VR Glasses. In an app installed from
    // the release branches these options go on the expo-horizon-core entry above;
    // this repo's example runs them from the local workspace package instead.
    [
      'expo-horizon-quest',
      {
        // This example pins public ViroReact 3.0.2, so the patched renderer goes
        // into quest too: floor-level origin and runtime controller models.
        viroRendererOverlay: true,
        // Meta: "The `quest3+` specifier includes Quest 3 family, Meta VR Glasses, and future devices."
        storeDeviceTargets: 'quest3+',
        // Meta VR Layout SDK in the quest flavor only: Library, Details and
        // Controls open as Horizon OS windows around the launcher panel. The
        // JS side (src/layout/metaWindows.ts) stays inline off Horizon.
        metaLayoutSdk: true,
        // Quest-only strikes. Each one is added to every flavor by another
        // package, and nothing in this app uses it on Meta Horizon:
        //  - CAMERA + android.hardware.camera and HEADSET_CAMERA come from
        //    @reactvision/react-viro's plugin for AR, ViroObjectDetector and
        //    the Passthrough Camera API. The immersive root is
        //    ViroVRSceneNavigator without passthroughEnabled, and nothing
        //    renders ViroXRSceneNavigator, ViroCameraTexture or
        //    ViroObjectDetector.
        //  - READ/WRITE_EXTERNAL_STORAGE come from the Expo template,
        //    expo-file-system and the Viro AARs. No code reads or writes
        //    shared storage or opens a picker.
        //  - play-services-location is Viro's ARCore Geospatial dependency.
        //    Quest has no ARCore, and no Viro class references it.
        // pico and mobile keep all of them.
        questRemovePermissions: [
          'android.permission.READ_EXTERNAL_STORAGE',
          'android.permission.WRITE_EXTERNAL_STORAGE',
          'android.permission.CAMERA',
          'horizonos.permission.HEADSET_CAMERA',
        ],
        questRemoveFeatures: ['android.hardware.camera'],
        questExcludeDependencies: ['com.google.android.gms:play-services-location'],
      },
    ],
    // PICO renders immersive scenes without a Platform Services account.
    // Its native flavor, SDK repositories, loader and manifest are configured
    // automatically by @expo-pico/core during Expo prebuild.
    [
      '@expo-pico/core',
      {
        buildVariant: 'pico',
        // PICO 4 / 4 Ultra = OS 5; Project Swan = OS 6.
        xrMode: (process.env.PICO_XR_MODE ?? 'pico-os5') as 'pico-os5' | 'pico-swan',
        appType: 'mr',
        // Optional for rendering; required for PPS account, IAP and leaderboard calls.
        platformService: {
          picoAppId: process.env.PICO_PLATFORM_APP_ID ?? process.env.PICO_APP_ID,
          picoAppKey: process.env.PICO_PLATFORM_APP_KEY,
        },
        targetProfile: 'auto',
        targetDevices: ['pico-4', 'pico-4-ultra', 'swan'],
        spatialMode: 'shared-space',
        defaultContainerMode: 'window-container',
        defaultWidth: '1280dp',
        defaultHeight: '800dp',
        handTracking: true,
        passthrough: true,
        // The example still pins stock Viro 3.0.2: keep these compatibility
        // overlays on until installing the validated 3.1.0 Viro + ViroCore pair.
        openXrLoaderOverlay: true,
        viroRendererOverlay: true,
        entitlementCheck: false,
      },
    ],
  ],
});
