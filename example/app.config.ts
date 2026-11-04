import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * The pico flavor exists once a PICO app ID is exported, the same way the
 * quest flavor reads HORIZON_APP_ID: `PICO_APP_ID=<id> yarn prebuild:pico`.
 * PICO OS closes an app whose ID is not registered for its package, so
 * @expo-pico/core rejects sample values such as `1234567` at prebuild.
 */
const picoAppId = process.env.PICO_APP_ID?.trim() || undefined;
const picoEnabled = Boolean(picoAppId || process.env.PICO_PLATFORM_APP_ID?.trim());

/** @expo-pico/core options for the pico flavor (PICO 4, PICO 4 Ultra, Swan). */
const PICO_CORE_OPTIONS = {
  buildVariant: 'pico',
  // PICO 4 / PICO 4 Ultra → 'pico-os5' (legacy PVR XR runtime).
  // PICO Swan             → 'pico-swan' (next-gen, ships on PICO OS 6).
  xrMode: (process.env.PICO_XR_MODE ?? 'pico-os5') as 'mobile' | 'pico-os5' | 'pico-swan',
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
  // Same landscape panel as the Meta flavor, written to the PICO-flavor
  // manifest so the launcher never opens as a phone-shaped window.
  defaultWidth: '1280dp',
  defaultHeight: '800dp',
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
  // This example pins public ViroReact 3.0.2, so both overlays stay on. The
  // renderer overlay gives PICO a floor-level origin (stock puts y=0 at eye
  // level, so the floor lands at waist height) and maps controller B to
  // back. Set both false only after installing the paired fork build; see
  // the integration guide.
  openXrLoaderOverlay: true,
  viroRendererOverlay: true,
  entitlementCheck: false,
  developerTools: true,
  enableEmulatorOptimizations: true,
  targetSdkVersion: 34,
} as const;

/** PICO Platform Service and Spatial SDK packages, pico flavor only. */
const PICO_FEATURE_PLUGINS: NonNullable<ExpoConfig['plugins']> = [
  [
    '@expo-pico/spatial',
    {
      // Links PICO Spatial SDK 6 into the pico flavor so the WindowContainer
      // bridge is exercised. On PICO OS 5 it reports spatialPlatform: false.
      enableSpatialSdk: true,
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
];

// SDK 58 dropped `newArchEnabled` from ExpoConfig; @expo-pico/core's
// new-architecture check still reads it, so the type carries it.
export default ({ config }: ConfigContext): ExpoConfig & { newArchEnabled: boolean } => ({
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
        // Written as <metavr:uses-metavr-sdk> in the quest manifest. Without
        // it Horizon OS logs "the client's manifest does not specify a minimum
        // HzOS SDK version". 207 is the first SDK that reads the declaration
        // (older releases ignore it); 209 is the SDK the example is tested on
        // (Quest 3S, 2026-11-04).
        horizonMinSdkVersion: 207,
        horizonTargetSdkVersion: 209,
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
        android: {
          xRMode: picoEnabled ? ['QUEST', 'PICO'] : ['QUEST'],
          questSupportedDevices: 'quest3|quest3s|vrglasses',
        },
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
        // Meta VR Layout SDK in the quest flavor only. It opens one window,
        // the navigation rail, flush outside the main panel's left edge
        // (src/ui/AppShell.tsx, docs/adr/0001).
        metaLayoutSdk: true,
        // The detail panel: a second activity Horizon OS opens beside the main
        // panel. Same size as SHELL.detailPanelSizeDp (src/ui/theme.ts).
        detailPanel: { defaultWidth: '420dp', defaultHeight: '600dp' },
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
    // Always listed: with or without an app ID it keeps one launcher tile
    // and marks Viro's VRActivity for enterImmersiveScene(). The pico flavor
    // and everything after this entry need PICO_APP_ID.
    ['@expo-pico/core', picoEnabled ? { picoAppId, ...PICO_CORE_OPTIONS } : {}],
    ...(picoEnabled ? PICO_FEATURE_PLUGINS : []),
  ],
});
