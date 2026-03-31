# expo-pico-core

Expo config plugin and runtime module for **PICO OS 6** XR/spatial devices.

`expo-pico-core` is the foundation package in the `expo-pico` family. It configures your Expo Android project to build and run on PICO headsets (PICO 4, PICO 4 Ultra, Neo3) using Continuous Native Generation (CNG) — no manual Android project editing required.

## Compatibility

| `expo-pico-core` | Expo SDK | React Native | Architecture     |
| ----------------- | -------- | ------------ | ---------------- |
| 0.1.x             | 55       | 0.79.x       | New Architecture |

**Forward-compatibility target:** Expo SDK 56+ / React Native 0.84.1+ (via Expo SDK 56, not directly).

## Installation

```bash
npm install expo-pico-core
# or
yarn add expo-pico-core
```

## Configuration

Add the plugin to your `app.config.ts` (or `app.json`):

```typescript
export default {
  expo: {
    plugins: [
      [
        'expo-pico-core',
        {
          picoAppId: '1234567890',
          targetDevices: ['pico-4', 'pico-4-ultra'],
          spatialMode: '2d',
          handTracking: true,
        },
      ],
    ],
  },
};
```

Then regenerate native projects:

```bash
npx expo prebuild --clean
```

### Plugin Options

| Option              | Type                                         | Default  | Description                                            |
| ------------------- | -------------------------------------------- | -------- | ------------------------------------------------------ |
| `enabled`           | `boolean`                                    | `true`   | Master toggle for all PICO mutations                   |
| `picoAppId`         | `string`                                     | `''`     | PICO platform application ID                           |
| `buildVariant`      | `'mobile' \| 'pico'`                         | `'pico'` | Whether to inject PICO product flavor                  |
| `targetDevices`     | `('pico-4' \| 'pico-4-ultra' \| 'neo3' \| 'swan')[]` | `[]`     | Supported PICO device targets                          |
| `spatialMode`       | `'2d' \| 'windowed' \| 'immersive'`          | `'2d'`   | Spatial rendering mode on PICO devices                 |
| `handTracking`      | `boolean`                                    | `false`  | Declare hand tracking capability                       |
| `passthrough`       | `boolean`                                    | `false`  | Declare video passthrough / MR capability              |
| `sceneUnderstanding`| `boolean`                                    | `false`  | Declare scene understanding capability                 |
| `entitlementCheck`  | `boolean`                                    | `false`  | Enable PICO DRM entitlement check                      |
| `minSdkVersion`     | `number`                                     | `32`     | Android minSdkVersion for the PICO flavor              |
| `targetSdkVersion`  | `number`                                     | `34`     | Android targetSdkVersion for the PICO flavor           |

## What It Configures Automatically

When `buildVariant` is `'pico'` (the default), the plugin:

- **app/build.gradle**: Adds `mobile` and `pico` product flavors under a `device` dimension
- **project build.gradle**: Adds the PICO Maven repository
- **gradle.properties**: Sets `picoAppId`, `picoSpatialMode`, `picoBuildEnabled`
- **strings.xml**: Adds `pico_app_id` and `pico_spatial_mode` string resources
- **app/src/pico/AndroidManifest.xml**: Creates a PICO-flavor manifest with:
  - VR headtracking feature declaration
  - Optional hand tracking, passthrough, scene understanding features
  - Supported device metadata
  - Spatial mode metadata
  - Entitlement check metadata
  - Prohibited permission removal via `tools:node="remove"`

## Build Variants

| Variant        | Description                              |
| -------------- | ---------------------------------------- |
| `mobileDebug`  | Debug build for standard Android devices |
| `mobileRelease`| Release build for standard Android       |
| `picoDebug`    | Debug build for PICO headsets            |
| `picoRelease`  | Release build for PICO headsets          |

```bash
# Standard Android
npx expo run:android --variant mobileDebug

# PICO headset
npx expo run:android --variant picoDebug
```

## Runtime API

```typescript
import {
  isPicoBuild,
  isPicoDevice,
  getSpatialMode,
  getPicoRuntimeInfo,
} from 'expo-pico-core';

isPicoBuild();        // true if built with pico flavor
isPicoDevice();       // true if running on PICO hardware
getSpatialMode();     // '2d' | 'windowed' | 'immersive'
getPicoRuntimeInfo(); // { isPicoBuild, isPicoDevice, spatialMode, picoAppId, picoOsVersion, deviceModel }
```

All runtime APIs are **synchronous** — they read compile-time constants and device properties resolved at module initialization.

## Limitations

- **Android / PICO OS 6 only** — no iOS, no web
- **New Architecture only** — Legacy Architecture is not supported
- Does not include PICO Platform SDK runtime features (account, IAP, notifications) — use sibling packages
- The `withDangerousMod` is used once to write the PICO-flavor source set manifest; this is the only file-system mutation
- PICO Maven repository URL and SDK metadata keys may change with PICO SDK updates

## Roadmap

- [ ] `expo-pico-spatial` — spatial anchoring, scene mesh, layout helpers
- [ ] `expo-pico-account` — PICO account login and identity
- [ ] `expo-pico-iap` — PICO store in-app purchases
- [ ] `expo-pico-notifications` — PICO push notification support
- [ ] Expo SDK 56 / RN 0.84.1 validation
- [ ] EAS Build integration guide

## License

MIT
