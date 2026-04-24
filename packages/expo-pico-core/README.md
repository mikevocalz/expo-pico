# expo-pico-core

Expo config plugin + runtime module + diagnostics CLI for **PICO OS 6** / **Project Swan** XR devices.

`expo-pico-core` is the foundation of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family. It configures your Expo Android project to build and run on PICO headsets (PICO 4, PICO 4 Ultra, Swan) via Continuous Native Generation — no manual Android project editing required.

> See [ARCHITECTURE.md](https://github.com/mikevocalz/expo-pico/blob/main/ARCHITECTURE.md) for the full design document (§15–§22) covering Swan platform mode, launcher contract, Platform SDK identity, hardware capabilities, OpenXR loader, runtime diagnostics, and Phase J reflection-based SDK detection.

## Status

- **Maturity:** stable candidate
- **Platform:** Android only (PICO is Android-only)
- **Runtime target:** PICO OS 6 (PICO 4 / 4 Ultra / Swan / Neo3), Android New Architecture
- **Renderer:** renderer-agnostic — composes cleanly with [`@react-three/fiber/native`](https://github.com/pmndrs/react-three-fiber) + [`expo-gl`](https://github.com/expo/expo/tree/main/packages/expo-gl), [`@babylonjs/react-native`](https://github.com/BabylonJS/BabylonReactNative), Unity-as-a-Library, and any Android renderer that uses the system OpenXR loader

## Compatibility

| `expo-pico-core` | Expo SDK | React Native | Architecture     |
| ----------------- | -------- | ------------ | ---------------- |
| 0.1.x → 1.0       | 55       | 0.84.1       | New Architecture |

Forward-compatibility target: Expo SDK 56+ through Expo SDK's own support matrix.

## Install

```bash
yarn add expo-pico-core
```

## Quick start

```ts
// app.config.ts
export default {
  expo: {
    name: 'my-pico-app',
    slug: 'my-pico-app',
    newArchEnabled: true, // required
    orientation: 'landscape',
    plugins: [
      [
        'expo-pico-core',
        {
          xrMode: 'pico-swan',
          appType: 'vr',
          buildVariant: 'pico',
          platformService: {
            picoAppId: process.env.PICO_PLATFORM_APP_ID,
            picoAppKey: process.env.PICO_PLATFORM_APP_KEY,
          },
          handTracking: true,
          passthrough: true,
          refreshRates: [72, 90, 120],
        },
      ],
    ],
  },
};
```

Then:

```bash
npx expo prebuild --clean
npx expo run:android --variant picoDebug
```

## Plugin options

Full plugin option reference. All options are optional; defaults shown below.

### Platform mode

| Option              | Type                                      | Default         | Description                                                                |
| ------------------- | ----------------------------------------- | --------------- | -------------------------------------------------------------------------- |
| `enabled`           | `boolean`                                 | `true`          | Master toggle for all PICO mutations                                       |
| `xrMode`            | `'mobile' \| 'pico-os6' \| 'pico-swan'`   | tracks variant  | Which native runtime `PicoCorePackage` registers at boot                   |
| `appType`           | `'vr' \| 'mr' \| '2d'`                    | tracks `xrMode` | Launcher enumeration: drives `pvr.app.type` + immersive categories         |
| `buildVariant`      | `'mobile' \| 'pico' \| 'dual'`            | `'pico'`        | Android product flavor strategy                                            |
| `picoSwan`          | `PicoSwanPluginOptions`                   | `{}`            | Swan-mode-specific options (subproject path, Maven artifact, source set)   |
| `targetProfile`     | `'auto' \| 'legacy' \| 'pico4' \| 'pico4ultra' \| 'swan'` | `'auto'` | Hardware family hint for runtime                                           |
| `targetDevices`     | `PicoDeviceTarget[]`                      | `[]`            | Declared supported hardware                                                |
| `minSdkVersion`     | `number`                                  | `32` / `33`     | Min SDK for the `pico` flavor (Swan bumps to 33)                           |
| `targetSdkVersion`  | `number`                                  | `34`            | Target SDK for the `pico` flavor                                           |

### Platform SDK identity

| Option                              | Type                                         | Description                                                                     |
| ----------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| `platformService.picoAppId`         | `string`                                     | PICO Platform app ID (writes `pico_app_id` string resource + BuildConfig field) |
| `platformService.picoAppKey`        | `string`                                     | PICO Platform app key (writes `pico_app_key`)                                   |
| `platformService.picoMerchantId`    | `string`                                     | IAP merchant ID (writes `pico_merchant_id`)                                     |
| `platformService.picoPayKey`        | `string`                                     | IAP payment key (writes `pico_pay_key`)                                         |
| `platformService.foreign`           | `{ picoAppId?, picoAppKey?, picoMerchantId?, picoPayKey? }` | Global-region identity siblings (writes `_foreign` resources)                   |
| `platformService.declareActivities` | `boolean`                                    | Declare `com.pico.loginpaysdk.UnityAuthInterface` + `PicoSDKBrowser` activities in flavor manifest. Default: true when any identity field is set. |

### Hardware capability declarations

All default to `false` / empty. Each emits `uses-feature` (`android:required="false"`), permission(s), and/or meta-data entries.

| Option                    | Surfaces                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `handTracking`            | `pico.hardware.handtracking`                                                            |
| `passthrough`             | `pico.hardware.passthrough`                                                             |
| `sceneUnderstanding`      | `pico.software.scene` (plane-only)                                                      |
| `sceneMesh`               | `pico.software.scenemesh` (distinct from `sceneUnderstanding`)                          |
| `eyeTracking`             | `pico.hardware.eyetracking` + `com.picovr.permission.EYE_TRACKING`                      |
| `faceTracking`            | `pico.hardware.facetracking` + `com.picovr.permission.FACE_TRACKING`                    |
| `bodyTracking`            | `pico.hardware.bodytracking` + `com.picovr.permission.BODY_TRACKING` *(seam)*           |
| `spatialAudio`            | `pico.hardware.spatialaudio` *(seam)*                                                   |
| `foveatedRendering`       | `pico.hardware.foveation` + `com.pico.foveation.enabled=true` meta *(seam)*             |
| `boundary`                | `pico.hardware.boundary` + `com.picovr.permission.BOUNDARY` *(seam)*                    |
| `highSamplingRateSensors` | `android.permission.HIGH_SAMPLING_RATE_SENSORS`                                         |
| `refreshRates`            | `com.pico.refreshRates` meta with comma-separated Hz values *(seam)*                    |

Values marked *(seam)* are best-known key names pending PICO doc confirmation; emitted with `required="false"` so misnames are install-safe.

### Spatial / runtime

| Option                  | Type                                                         | Description                                                               |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `spatialMode`           | `'2d' \| 'windowed' \| 'shared-space' \| 'full-space' \| 'immersive' \| 'volume'` | Spatial rendering mode meta                                               |
| `defaultContainerMode`  | `'window-container' \| 'stage' \| 'none'`                    | Spatial container type                                                    |
| `entitlementCheck`      | `boolean`                                                    | Enables PICO DRM entitlement check meta                                   |
| `developerTools`        | `boolean`                                                    | PICO OS 6 dev-tools overlay opt-in                                        |
| `enableEmulatorOptimizations` | `boolean`                                              | Project Swan emulator tweaks (unrequired VR headtracking feature, etc.)   |

### Toolchain

| Option                    | Type      | Default               | Description                                                                 |
| ------------------------- | --------- | --------------------- | --------------------------------------------------------------------------- |
| `ndkAbiFilters`           | `boolean` | `xrMode !== 'mobile'` | Restrict `pico`/`dual` flavors to `arm64-v8a`. `mobile` is never filtered.  |
| `openXrLoaderDeclaration` | `boolean` | `xrMode !== 'mobile'` | Emit `<uses-native-library>` for `libopenxr_loader.so`                      |

## Build variants

| Variant        | Emitted when                           |
| -------------- | -------------------------------------- |
| `mobileDebug`  | always                                 |
| `mobileRelease` | always                                |
| `picoDebug`    | `buildVariant === 'pico'` or `'dual'`  |
| `picoRelease`  | `buildVariant === 'pico'` or `'dual'`  |
| `dualDebug`    | `buildVariant === 'dual'`              |
| `dualRelease`  | `buildVariant === 'dual'`              |

```bash
# Standard Android phone/tablet
npx expo run:android --variant mobileDebug

# PICO headset
npx expo run:android --variant picoDebug
```

## Runtime JS API

```ts
import {
  // Platform / device
  isPicoBuild,
  isPicoDevice,
  getPicoTargetProfile,
  // XR mode + app type
  getXrMode,
  isSwanRuntime,
  getAppType,
  // Spatial
  getSpatialMode,
  // Platform SDK identity (Phase B)
  hasPlatformIdentity,
  hasIapIdentity,
  // Runtime SDK detection (Phase J)
  isPlatformSdkPresent,
  getPlatformSdkVersion,
  getPlatformSdkProbe,
  // Aggregate info
  getPicoRuntimeInfo,
  // Diagnostics (Phase F)
  getPicoDiagnostics,
  formatDiagnostics,
} from 'expo-pico-core';

console.log(getPicoRuntimeInfo());
// {
//   isPicoBuild: true,
//   isPicoDevice: true,
//   xrMode: 'pico-swan',
//   appType: 'vr',
//   spatialMode: 'shared-space',
//   targetProfile: 'swan',
//   picoAppId: 'my-app',
//   hasPlatformIdentity: true,
//   hasIapIdentity: false,
//   platformSdkPresent: true,
//   platformSdkVersion: '3.2.0',
//   swanRuntimeInitialized: true,
//   ...
// }

const report = await getPicoDiagnostics();
if (report.summary.hasError) {
  console.error(formatDiagnostics(report));
}
```

All device / identity / SDK getters are synchronous — they read compile-time constants + BuildConfig fields resolved at module init.

## Capability runtime (Phase K)

Every prebuild capability flag (eye tracking, passthrough, foveated rendering, boundary, scene mesh, controller haptics, …) has a matching runtime API. Flags that aren't enabled at prebuild time or that the device doesn't support return `null` / `false` / empty lists — callers destructure safely without branching.

```ts
import { capabilities } from 'expo-pico-core';

// Synchronous: what did the prebuild plugin declare?
const decl = capabilities.getDeclared();
// { handTracking: true, passthrough: true, eyeTracking: false, ... }

// Three-layer snapshot: declared × systemFeature × sdk × fullyAvailable.
const snapshot = await capabilities.getSnapshot();

// Display surfaces (OpenXR-backed, no PICO SDK required):
await capabilities.display.setRefreshRate(90);
const rates = await capabilities.display.getSupportedRefreshRates();
await capabilities.display.setFoveationLevel('high');
await capabilities.display.setPassthroughEnabled(true);

// Tracking surfaces (PICO SDK gated; null when SDK absent):
if (await capabilities.isAvailable('eyeTracking')) {
  await capabilities.eye.enable();
  const pose = await capabilities.eye.getPose();
}
const hand = await capabilities.hand.getPose();
const joints = await capabilities.body.getJoints();
const weights = await capabilities.face.getWeights();

// Boundary + scene:
const geom = await capabilities.boundary.getGeometry();
const planes = await capabilities.scene.getPlanes();

// Controllers + Motion Tracker:
const ctrls = await capabilities.controllers.list();
await capabilities.controllers.triggerHaptic('left', 0.8, 40);
const trackers = await capabilities.motionTracker.list();

// IMU sensor rate report (pure AOSP, no SDK gating):
const sensors = await capabilities.sensors.getHighRate();
```

Phase K is reflection-gated on the Kotlin side — no compile-time dependency on the NDA-distributed PICO Platform SDK. Drop the SDK AAR into `android/app/libs/` and the probes light up automatically; without it every method returns the documented degraded shape.

## CLI: `expo-pico-doctor`

Ships as a binary alongside the JS API. Lints your `app.config` against the same seven checks the prebuild pass emits, without running `npx expo prebuild`.

```bash
npx expo-pico-doctor                  # pretty output
npx expo-pico-doctor --json           # machine-readable
npx expo-pico-doctor --fail-on-warning # CI gate
```

See [ARCHITECTURE §21](https://github.com/mikevocalz/expo-pico/blob/main/ARCHITECTURE.md#21-expo-pico-doctor-cli-phase-g) for details.

## Sibling packages

Each sibling adds a narrow native surface and a matching JS API. All are peer-depend on `expo-pico-core`.

| Package                                                                                               | Surface                                       |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [`expo-pico-spatial`](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-spatial)   | Spatial anchors, containers, space transitions |
| [`expo-pico-account`](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-account)   | PICO account identity                         |
| [`expo-pico-iap`](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-iap)           | PICO store in-app purchases                   |
| [`expo-pico-notifications`](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-notifications) | Push registration + tokens                    |
| [`expo-pico-rtc`](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-rtc)           | Real-time voice channels                      |
| [`expo-pico-rooms`](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-rooms)       | Rooms + matchmaking                           |
| [`expo-pico-achievements`](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-achievements) | Achievements                                  |
| [`expo-pico-leaderboards`](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-leaderboards) | Leaderboards                                  |
| [`expo-pico-social`](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-social)     | Friends, presence, invites                    |
| [`expo-pico-storage`](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-storage)   | Cloud storage                                 |
| [`expo-pico-subscription`](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-subscription) | Subscription billing + entitlements           |

## Limitations

- Android / PICO OS 6 only. No iOS. No web.
- New Architecture only — `newArchEnabled: true` is required.
- Plugin emits a single `withDangerousMod` when writing the PICO-flavor source-set manifest. That is the only filesystem mutation; every other mutation uses safe structured mods.
- Some hardware capability keys are best-known seams — clearly flagged in the options table and the ARCHITECTURE doc. Emitted with `android:required="false"` so misnames are install-safe.
- PICO Platform SDK native bindings (account, IAP, RTC, etc.) are extension seams in the sibling packages until the PICO SDK AAR is a public Maven artifact. Core's [Phase J probe](https://github.com/mikevocalz/expo-pico/blob/main/ARCHITECTURE.md#22-reflection-based-pico-platform-sdk-detection-phase-j) activates siblings automatically when a consumer drops the AAR into `android/app/libs/`.

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)
- [ARCHITECTURE.md](https://github.com/mikevocalz/expo-pico/blob/main/ARCHITECTURE.md) (§1–§22)
- [RELEASING.md](https://github.com/mikevocalz/expo-pico/blob/main/RELEASING.md)
- Issues: https://github.com/mikevocalz/expo-pico/issues

## License

MIT
