import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'expo-pico-example',
  slug: 'expo-pico-example',
  version: '1.0.0',
  orientation: 'landscape',
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
    // Meta Horizon / Quest build flavor + manifest (Software Mansion).
    // Creates the `quest` Android build flavor with the right
    // <uses-feature> + panel sizing + supportedDevices entries for the
    // Meta Horizon Store. Build with `npm run quest`.
    [
      'expo-horizon-core',
      {
        horizonAppId: process.env.HORIZON_APP_ID ?? '',
        supportedDevices: 'quest3|quest3s',
        // defaultWidth/defaultHeight intentionally omitted — those are for
        // 2D panel apps. We're shipping an immersive VR app (Viro
        // `<ViroVRSceneNavigator>` + `com.oculus.intent.category.VR`)
        // so Horizon places it as an immersive session, not a flat panel.
        disableVrHeadtracking: false,
        allowBackup: false,
      },
    ],
    // ReactVision/Viro renderer — pairs with expo-pico-core's openxr_loader
    // declaration so the same JS runs immersive on PICO (picoDebug) and
    // Meta Quest (questDebug).
    [
      '@reactvision/react-viro',
      {
        android: { xRMode: ['QUEST', 'PICO'] },
      },
    ],
    [
      '@expo-pico/core',
      {
        picoAppId: process.env.PICO_APP_ID ?? '',
        buildVariant: 'pico',
        // PICO 4 / PICO 4 Ultra → 'pico-os5' (legacy PVR XR runtime).
        // PICO Swan             → 'pico-swan' (next-gen, ships on PICO OS 6).
        xrMode: (process.env.PICO_XR_MODE ?? 'pico-os5') as
          | 'mobile'
          | 'pico-os5'
          | 'pico-swan',
        // Launcher contract app type. Drives `pvr.app.type` meta-data.
        //
        // 'mr' = Mixed Reality / passthrough — PICO renders the camera feed
        // as the background and our content composites on top. User sees
        // the real room with our 2D panel floating in front, not an
        // immersive VR void. The dedicated VRActivity (from react-viro's
        // plugin) still handles any explicit `<ViroVRSceneNavigator>`
        // transition when the Scene tab activates.
        appType: 'mr',
        // Platform SDK identity. Populate from env so secrets
        // don't land in source. Leave fields undefined to skip writing
        // their string resources; the flavor manifest writer will then
        // also skip declaring the login/browser activities.
        platformService: {
          picoAppId: process.env.PICO_PLATFORM_APP_ID,
          picoAppKey: process.env.PICO_PLATFORM_APP_KEY,
          picoMerchantId: process.env.PICO_MERCHANT_ID,
          picoPayKey: process.env.PICO_PAY_KEY,
          foreign: {
            picoAppId: process.env.PICO_PLATFORM_APP_ID_FOREIGN,
            picoAppKey: process.env.PICO_PLATFORM_APP_KEY_FOREIGN,
          },
        },
        picoSwan: {
          // swanRuntimeProject: {
          //   name: 'pico_swan_runtime',
          //   path: '../node_modules/@pico/swan-runtime-android/android',
          // },
          // swanSdkArtifact: 'com.pvr.swan:pvr-swan-runtime:0.1.0',
          declareSpatialContainerCategory: true,
          scaffoldSwanSourceSet: false,
        },
        targetProfile: 'auto',
        targetDevices: ['pico-4', 'pico-4-ultra', 'swan'],
        spatialMode: 'shared-space',
        defaultContainerMode: 'window-container',
        handTracking: true,
        passthrough: true,
        sceneUnderstanding: false,
        // Hardware capabilities. Each toggle emits a
        // uses-feature (required=false so non-capable devices still
        // install) plus the matching permission where applicable.
        // The example app declares every capability on so the Diagnostics
        // tab can exercise the runtime probes end-to-end on a
        // real PICO Swan device. Downstream apps should turn these off
        // unless they actually use the hardware — PICO reviewers flag
        // over-declared features.
        eyeTracking: true,
        faceTracking: true,
        bodyTracking: true,
        spatialAudio: true,
        foveatedRendering: true,
        highSamplingRateSensors: true, // Head-tracked VR typically needs 500+Hz IMU sampling.
        refreshRates: [72, 90, 120], // Declare the rates the renderer supports.
        // Late-audit additions.
        boundary: true, // Guardian / boundary system; opt in for room-scale apps.
        sceneMesh: true, // Scene mesh capture; distinct from plane-only sceneUnderstanding.
        // Controller input + Motion Tracker + haptics.
        picoSenseController: true,
        motionTracker: true,
        controllerHaptics: true,
        // Toolchain. Both default to true when xrMode !== 'mobile',
        // so these lines are only here for documentation / override. Set
        // ndkAbiFilters: false to keep the 32-bit slice; set
        // openXrLoaderDeclaration: false if your renderer bundles its own
        // non-system OpenXR loader (rare — Viro uses the system loader).
        ndkAbiFilters: true,
        openXrLoaderDeclaration: true,
        entitlementCheck: false,
        developerTools: true,
        enableEmulatorOptimizations: true,
        targetSdkVersion: 34,
      },
    ],
    [
      '@expo-pico/spatial',
      {
        anchorPersistence: false,
        sceneMeshEnabled: false,
      },
    ],
    '@expo-pico/iap',
    [
      '@expo-pico/notifications',
      {
        requestPostNotificationsPermission: true,
      },
    ],
    '@expo-pico/rtc',
    '@expo-pico/rooms',
    '@expo-pico/subscription',
    '@expo-pico/storage',
    '@expo-pico/social',
    '@expo-pico/achievements',
    '@expo-pico/leaderboards',
  ],
});
