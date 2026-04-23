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
  assetBundlePatterns: ['assets/**/*'],
  android: {
    package: 'com.example.expopico',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
  plugins: [
    [
      'expo-pico-core',
      {
        picoAppId: process.env.PICO_APP_ID ?? '',
        buildVariant: 'pico',
        xrMode: (process.env.PICO_XR_MODE ?? 'pico-swan') as
          | 'mobile'
          | 'pico-os6'
          | 'pico-swan',
        // Launcher contract app type. Drives `pvr.app.type` meta-data and
        // immersive launcher activity categories (OpenXR IMMERSIVE_HMD +
        // PICO VR). Defaults to 'vr' under any pico xrMode; set to 'mr'
        // for passthrough-first MR apps, or '2d' to opt out of immersive
        // enumeration entirely.
        appType: 'vr',
        // Phase B — Platform SDK identity. Populate from env so secrets
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
        // Phase C — hardware capabilities. Each toggle emits a
        // uses-feature (required=false so non-capable devices still
        // install) plus the matching permission where applicable.
        // Leave these off unless the app actually uses the hardware —
        // PICO reviewers may flag over-declared features.
        eyeTracking: false,
        faceTracking: false,
        bodyTracking: false,
        spatialAudio: false,
        foveatedRendering: false,
        highSamplingRateSensors: true, // Head-tracked VR typically needs 500+Hz IMU sampling.
        refreshRates: [72, 90], // Declare the rates the renderer supports.
        // Phase D — late-audit additions. Same default-off pattern as
        // the Phase C toggles.
        boundary: false, // Guardian / boundary system; opt in for room-scale apps.
        sceneMesh: false, // Scene mesh capture; distinct from plane-only sceneUnderstanding.
        // Phase E — toolchain. Both default to true when xrMode !== 'mobile',
        // so these lines are only here for documentation / override. Set
        // ndkAbiFilters: false to keep the 32-bit slice; set
        // openXrLoaderDeclaration: false if your renderer (e.g. a custom
        // Babylon Native build) bundles its own non-system OpenXR loader.
        ndkAbiFilters: true,
        openXrLoaderDeclaration: true,
        entitlementCheck: false,
        developerTools: true,
        enableEmulatorOptimizations: true,
        targetSdkVersion: 34,
      },
    ],
    [
      'expo-pico-spatial',
      {
        anchorPersistence: false,
        sceneMeshEnabled: false,
      },
    ],
    'expo-pico-iap',
    [
      'expo-pico-notifications',
      {
        requestPostNotificationsPermission: true,
      },
    ],
    'expo-pico-rtc',
    'expo-pico-rooms',
    'expo-pico-subscription',
    'expo-pico-storage',
    'expo-pico-social',
    'expo-pico-achievements',
    'expo-pico-leaderboards',
  ],
});
