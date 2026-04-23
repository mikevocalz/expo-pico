import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'expo-pico-example',
  slug: 'expo-pico-example',
  version: '1.0.0',
  orientation: 'landscape',
  newArchEnabled: true,
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
