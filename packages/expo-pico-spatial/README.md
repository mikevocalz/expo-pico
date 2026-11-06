# expo-pico-spatial

[![partial](https://img.shields.io/badge/Spatial_SDK_6-partial-946200?style=flat-square)](../../README.md#packages)
[![Android](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white)](../../docs/FAQ.md)

PICO OS 6 WindowContainer support, configuration diagnostics and typed spatial API contracts.

> Part of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family.

## Status

This package is alpha and Android-only.

- **Implemented:** WindowContainer open/close through the public Spatial SDK 6, with checks for SDK linkage and a compatible spatial platform. Calls return a result with a reason when unavailable.
- **Implemented diagnostics:** configured starting space/container values, SDK class probes, capability flags and native bridge status. Configured values are not observations of live space transitions.
- **Unimplemented:** anchors, changing container properties, full-space transitions, eye/face/body tracking and scene mesh retrieval/streaming. The native bridge rejects the asynchronous methods with `NOT_IMPLEMENTED` and does not advertise these capabilities. Listener registration does not produce frames. `getGazeSnapshot()` returns `null` while gaze is unavailable.

Installing an SDK archive or enabling capability declarations does not implement the unfinished APIs. The WindowContainer bridge is independent of those methods.

## Install

Install the GitHub release packages and the pinned Nitro peer into an Expo SDK 58 app:

```bash
npm install "github:mikevocalz/expo-pico#release/core" "github:mikevocalz/expo-pico#release/platform-service-common" "github:mikevocalz/expo-pico#release/spatial" react-native-nitro-modules@1.0.0-alpha.nightly.120.g33ef045b96c0
```

The packages are not published on npm. See [Installing from GitHub](../../docs/INSTALL-FROM-GITHUB.md) for release pins and peer dependencies. Keep the package-manager lockfile.

## Configure

For SDK 6 WindowContainer support on a compatible OS 6 device, add the core and spatial plugins to your existing Expo config:

```ts
plugins: [
  [
    '@expo-pico/core',
    {
      buildVariant: 'pico',
      xrMode: 'pico-swan',
      appType: '2d',
      spatialMode: '2d',
    },
  ],
  ['@expo-pico/spatial', { enableSpatialSdk: true }],
];
```

Use the [Quickstart](../../docs/QUICKSTART.md) for the remaining app config. Then regenerate and build:

```bash
npx expo prebuild --clean --platform android
npx expo run:android --variant picoDebug
```

`enableSpatialSdk` adds the public Maven Spatial SDK dependencies to PICO builds. Prebuild writes their declarations; Gradle resolves them during the Android build. You do not download AARs into `vendor/pico-sdk/`. PICO OS 5 and ordinary Android devices do not provide the required OS 6 spatial platform; inspect bridge status before opening a window.

## Open a WindowContainer

```ts
import {
  getLayoutBridgeStatus,
  openWindowContainer,
  closeWindowContainer,
} from '@expo-pico/spatial';

const status = getLayoutBridgeStatus();
if (status.sdkLinked && status.spatialPlatform) {
  const result = openWindowContainer('tools', { tag: 'main' });
  if (!result.ok) console.warn(result.reason);
} else {
  console.warn(status.reason);
}

// Later, close the same id and tag:
const result = closeWindowContainer('tools', { tag: 'main' });
if (!result.ok) console.warn(result.reason);
```

The window hosts the current activity's class. `{ ok: true }` means the SDK call returned successfully. The SDK provides no completion signal, so this result does not confirm a visible window. Inspect the headset and `ExpoPicoSpatial` logcat output when validating behavior.

## API

| Function                                      | Current behavior                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getSpaceState()`                             | Configured starting space: `shared-space`, `full-space` or `unknown`; not a live transition query.                                               |
| `getContainerType()`                          | Configured container type, or `none`; not a live window query.                                                                                   |
| `getSpatialCapabilities()`                    | False for unfinished spatial/tracking methods; reports SDK availability separately.                                                              |
| `getSpatialSdkVersion()`                      | Compatibility presence marker `"present"` when the SDK 6 bridge classes are linked, otherwise `null`. It does not report a semantic SDK version. |
| `getSpatialSdkProbe()`                        | SDK class presence by stable diagnostic name. Class presence does not imply method support.                                                      |
| `getLayoutBridgeStatus()`                     | `sdkLinked`, `spatialPlatform`, `reason` and `lastError`. Use this before WindowContainer calls.                                                 |
| `openWindowContainer(id, options?)`           | Calls the SDK 6 bridge, returning `{ ok: true }` or `{ ok: false, reason }`.                                                                     |
| `closeWindowContainer(id, options?)`          | Closes the window with the same id/tag through the SDK 6 bridge.                                                                                 |
| `createSpatialAnchor(pose)`                   | Rejects with `NOT_IMPLEMENTED` in this release.                                                                                                  |
| `setWindowContainerProperties(props)`         | Rejects with `NOT_IMPLEMENTED` in this release.                                                                                                  |
| `requestFullSpace()`                          | Rejects with `NOT_IMPLEMENTED` in this release.                                                                                                  |
| `getSceneMesh()`                              | Rejects with `NOT_IMPLEMENTED` in this release.                                                                                                  |
| `getGazeSnapshot()`                           | Returns `null` while eye gaze is unavailable.                                                                                                    |
| Gaze, scene-mesh, face and body listener APIs | Return removable subscriptions; native frame delivery is not implemented.                                                                        |

When the native module itself is absent, the throwing asynchronous wrappers retain `SERVICE_UNAVAILABLE`. This differs from an installed module whose method rejects with `NOT_IMPLEMENTED`.

Types include `PicoSpaceState`, `PicoContainerType`, `SpatialCapabilities`, `SpatialPose`, `SpatialAnchorHandle`, `WindowContainerProperties`, `WindowContainerResult` and `PicoSpatialLayoutBridgeStatus`.

## Native dependencies and diagnostics

The WindowContainer bridge uses the public Spatial SDK 6 core and foundation libraries. They are optional runtime dependencies enabled by this package's plugin. This is separate from PICO Platform Services (PPS); installing an account or purchases package does not enable spatial windows.

- `sdkLinked: false`: enable the spatial plugin's `enableSpatialSdk` option and rebuild the PICO flavor. Check Gradle dependency-resolution errors if needed.
- `sdkLinked: true`, `spatialPlatform: false`: the SDK classes are present, but the device cannot run the OS 6 bridge. Read `reason` for the platform result.
- `NOT_IMPLEMENTED` from an anchor, transition or scene method: native wiring is unfinished. Reinstalling SDKs or changing manifest flags will not enable it.

## Links

- [Package overview](../../README.md)
- [Quickstart](../../docs/QUICKSTART.md)
- [PICO Spatial SDK docs](https://developer.picoxr.com/document/spatial-sdk/)

## License

MIT
