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
        minSdkVersion: 32,
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
