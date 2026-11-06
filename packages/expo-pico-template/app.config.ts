import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Starter config for a PICO 4 / PICO 4 Ultra app.
 *
 * What's already wired:
 *   - New Architecture on (required by `expo-pico-core`).
 *   - `xrMode` set to `pico-os5` for PICO 4 / 4 Ultra. Flip to
 *     `pico-swan` when targeting Swan headsets.
 *   - `appType: '2d'` — a native React Native panel, like Horizon Core's
 *     base app. Add a renderer before opting into an immersive activity.
 *   - `platformService` reads app ID + key from env. Never commit
 *     credentials — keep them in EAS Secrets or a .env file.
 *   - Hardware capabilities stay opt-in, with no missing vendor AAR step.
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
  // create-expo-app substitutes these official template placeholders.
  name: 'Hello App Display Name',
  slug: 'helloworld',
  version: '1.0.0',
  orientation: 'default',
  // Add your own icon + splash by dropping PNGs into an assets/ directory
  // and uncommenting. The template intentionally does not ship default
  // artwork — every PICO app wants its own brand, and unbranded
  // placeholder assets routinely make it into Store submissions.
  // icon: './assets/icon.png',
  // splash: { image: './assets/splash.png', backgroundColor: '#0b0d1a' },
  newArchEnabled: true,
  android: {
    package: 'com.example.helloworld',
  },
  plugins: [
    [
      '@expo-pico/core',
      {
        // Flip to 'pico-swan' when targeting Project Swan hardware.
        xrMode: 'pico-os5',

        // The starter renders a normal RN panel. With a configured 3D
        // renderer, choose 'vr' or 'mr' and set your registered PICO_APP_ID.
        appType: '2d',

        // 'pico' writes the PICO-flavor manifest. 'dual' keeps both
        // mobile and pico flavors for cross-device dev work.
        buildVariant: 'pico',

        // The registered app ID for headset launch. PPS can use its own
        // identity below; no credentials are needed just to compile the APK.
        picoAppId: process.env.PICO_APP_ID,

        // Platform SDK identity. Populate via EAS Secrets in CI.
        // Doctor reports missing Platform Service identity as information.
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
        // handTracking: true,
        // passthrough: true,
        // sceneUnderstanding: false,
        // sceneMesh: false,
        // eyeTracking: false,
        // faceTracking: false,
        // bodyTracking: false,
        // spatialAudio: false,
        // foveatedRendering: false,
        // boundary: false,
        // refreshRates: [72, 90, 120],
        // highSamplingRateSensors: true,
      },
    ],
    // Add plugins exposed by sibling packages as you install them.
    // Account autolinks and uses Core's configuration; it has no plugin.
    // ['@expo-pico/iap', {}],
    // ['@expo-pico/notifications', { requestPostNotificationsPermission: true }],
    // ['@expo-pico/rtc', { microphonePermission: true }],
  ],
});
