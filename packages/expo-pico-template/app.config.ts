import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Starter config for a PICO OS 6 / Project Swan app.
 *
 * What's already wired:
 *   - New Architecture on (required by `expo-pico-core`).
 *   - `xrMode` set to `pico-os5` for PICO 4 / 4 Ultra. Flip to
 *     `pico-swan` when targeting Swan headsets.
 *   - `appType: 'vr'` — emits `pvr.app.type=vr`, OpenXR
 *     `IMMERSIVE_HMD` + `com.pico.intent.category.VR` on the launcher
 *     activity, and the PICO system-package <queries> block.
 *   - `platformService` reads app ID + key from env. Never commit
 *     credentials — keep them in EAS Secrets or a .env file.
 *   - `handTracking` + `passthrough` opt-in. Add more hardware
 *     capabilities as you need them.
 *
 * Extension points — uncomment and fill as needed:
 *   - `picoMerchantId` / `picoPayKey` for in-app purchases (when
 *     installing `expo-pico-iap` + `expo-pico-subscription`).
 *   - `platformService.foreign.*` for dual-region (CN + Global) apps.
 *   - `refreshRates`, `eyeTracking`, `faceTracking`, `foveatedRendering`,
 *     `boundary`, `sceneMesh` for extra capability declarations.
 *
 * Run `npx expo-pico-doctor` at any time to lint this config before
 * prebuild.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'my-pico-app',
  slug: 'my-pico-app',
  version: '1.0.0',
  orientation: 'landscape',
  // Add your own icon + splash by dropping PNGs into an assets/ directory
  // and uncommenting. The template intentionally does not ship default
  // artwork — every PICO app wants its own brand, and unbranded
  // placeholder assets routinely make it into Store submissions.
  // icon: './assets/icon.png',
  // splash: { image: './assets/splash.png', backgroundColor: '#0b0d1a' },
  newArchEnabled: true,
  android: {
    package: 'com.example.mypicoapp',
  },
  plugins: [
    [
      '@expo-pico/core',
      {
        // Flip to 'pico-swan' when targeting Project Swan hardware.
        xrMode: 'pico-os5',

        // 'vr' for immersive; 'mr' for passthrough-first; '2d' opts
        // out of the immersive launcher entirely.
        appType: 'vr',

        // 'pico' writes the PICO-flavor manifest. 'dual' keeps both
        // mobile and pico flavors for cross-device dev work.
        buildVariant: 'pico',

        // Platform SDK identity. Populate via EAS Secrets in CI.
        // Doctor warns at prebuild if `platformService.picoAppId` is
        // missing under an immersive xrMode.
        platformService: {
          picoAppId: process.env.PICO_PLATFORM_APP_ID,
          picoAppKey: process.env.PICO_PLATFORM_APP_KEY,
          // Uncomment when you add `expo-pico-iap`:
          // picoMerchantId: process.env.PICO_MERCHANT_ID,
          // picoPayKey: process.env.PICO_PAY_KEY,
          // Uncomment for dual-region (CN + Global) apps:
          // foreign: {
          //   picoAppId: process.env.PICO_PLATFORM_APP_ID_FOREIGN,
          //   picoAppKey: process.env.PICO_PLATFORM_APP_KEY_FOREIGN,
          // },
        },

        // Capability declarations — emit only what you actually use.
        // PICO Store reviewers flag over-declared features.
        handTracking: true,
        passthrough: true,
        // sceneUnderstanding: false,
        // sceneMesh: false,
        // eyeTracking: false,
        // faceTracking: false,
        // bodyTracking: false,
        // spatialAudio: false,
        // foveatedRendering: false,
        // boundary: false,
        // refreshRates: [72, 90, 120],
        highSamplingRateSensors: true,
      },
    ],
    // Add sibling packages here as you install them:
    // ['@expo-pico/account', {}],
    // ['@expo-pico/iap', {}],
    // ['@expo-pico/notifications', { requestPostNotificationsPermission: true }],
    // ['@expo-pico/rtc', { microphonePermission: true }],
  ],
});
