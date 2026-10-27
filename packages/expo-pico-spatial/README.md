# expo-pico-spatial

[![seam](https://img.shields.io/badge/PPS_1.0.x-seam-6B7280?style=flat-square)](../../README.md#packages)
[![Android](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white)](../../docs/FAQ.md)

Spatial mode helpers, container APIs, and runtime seams for PICO OS 6 Spatial SDK.

> Part of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family.

## Status

- Maturity: alpha
- PICO Spatial SDK linkage: **none.** Eight of the eleven native methods reject
  with `SPATIAL_SDK_NOT_LINKED`, and dropping `pico-spatial-sdk.aar` into
  `vendor/pico-sdk/` does **not** change that — `needsSpatialSdk()` rejects
  unconditionally and no code path calls the SDK. Wiring it is outstanding work,
  not a packaging step.
- What works today: the three detection methods (`getSpaceState`,
  `getContainerType`, `getSpatialCapabilities`) plus `getSpatialSdkProbe()`,
  which read `BuildConfig` mirror fields set by `expo-pico-core` and
  `Class.forName` probes. Those need no AAR.
- Platform: Android only.
- Runtime target: PICO OS 6 in shared-space, full-space, or volume modes.

## Install

```bash
yarn add @expo-pico/core @expo-pico/spatial react-native-nitro-modules
```

## Configure

Spatial features are selected via `expo-pico-core` plugin options. This package only scaffolds the native seams. Enable the spatial modes and capability toggles you need:

```ts
// app.config.ts
export default {
  plugins: [
    [
      '@expo-pico/core',
      {
        buildVariant: 'pico',
        xrMode: 'pico-swan', // use 'pico-os5' for PICO 4 / 4 Ultra
        appType: 'vr',
        spatialMode: 'shared-space', // or 'full-space', 'volume', 'windowed'
        defaultContainerMode: 'window-container', // or 'stage', 'none'
        handTracking: true,
        passthrough: true,
        sceneUnderstanding: true,
        boundary: true, // XR_PICO_boundary_ext
        sceneMesh: true, // distinct from sceneUnderstanding
      },
    ],
    '@expo-pico/spatial',
  ],
};
```

Then: `npx expo prebuild --clean`.

## Usage

```ts
import {
  getSpaceState,
  getContainerType,
  getSpatialCapabilities,
  getSpatialSdkVersion,
  createSpatialAnchor, // seam
  requestFullSpace, // seam
} from '@expo-pico/spatial';

function logSpatialStatus() {
  console.log({
    space: getSpaceState(), // 'shared-space' | 'full-space' | 'unknown'
    container: getContainerType(), // 'window-container' | 'stage' | 'none'
    caps: getSpatialCapabilities(),
    sdk: getSpatialSdkVersion(), // null until Spatial SDK is linked
  });
}

// Extension seams. Throw notImplementedError until SDK is wired.
try {
  await createSpatialAnchor({ position: [0, 0, -1], rotation: [0, 0, 0, 1] });
} catch (e) {
  console.warn('Anchor API is a seam:', e);
}
```

## API

| Function                                       | Description                                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `getSpaceState()`                              | Reports `shared-space` / `full-space` / `unknown`.                                            |
| `getContainerType()`                           | Reports the app's active container (`window-container` / `stage` / `none`).                   |
| `getSpatialCapabilities()`                     | Flags for anchors, scene understanding, passthrough, hand-tracking, Spatial SDK availability. |
| `getSpatialSdkVersion()`                       | Spatial SDK version, or `null` when not linked.                                               |
| `createSpatialAnchor(pose)` _(seam)_           | Place a persistent spatial anchor at a pose. Throws until wired.                              |
| `setWindowContainerProperties(props)` _(seam)_ | Configure a floating WindowContainer's size / pinning. Throws until wired.                    |
| `requestFullSpace()` _(seam)_                  | Transition from shared-space to full-space. Throws until wired.                               |

Types: `PicoSpaceState`, `PicoContainerType`, `SpatialCapabilities`, `SpatialAnchorHandle`, `Pose3D`, `WindowContainerProperties`.

## Runtime diagnostics

```ts
import { getSpatialCapabilities } from '@expo-pico/spatial';
import { getPicoRuntimeInfo } from '@expo-pico/core';

const info = getPicoRuntimeInfo();
const caps = getSpatialCapabilities();

console.log({
  spatialMode: info.spatialMode, // from plugin option
  containerMode: info.containerMode,
  xrMode: info.xrMode,
  caps, // runtime-probed feature flags
});
```

## Native artifacts

This package declares no Maven coordinate of its own. It has no PICO
Platform Service artifact behind it — see
[docs/PPS-WIRING-GAPS.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/PPS-WIRING-GAPS.md)
— and reaches whatever native code it needs through
`@expo-pico/core`. Installing it alongside other `@expo-pico/*`
packages adds nothing to the Android classpath that is not already
there.

## Limitations

- Anchor / container / space-transition runtime APIs are seams. The plugin correctly declares every relevant manifest feature (`pico.software.spatialanchor`, `pico.software.scene`, `pico.software.scenemesh`), but native runtime bindings require the PICO Spatial SDK AAR. Expect these to land later when the SDK surfaces stabilize publicly.
- `spatialMode: 'volume'` is the PICO OS 6 3D Volume container. The meta-data key is emitted as a best-known seam; verify against the PICO launcher when the Spatial SDK ships.

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)
- [PICO Spatial SDK docs](https://developer.picoxr.com/document/spatial-sdk/)

## License

MIT
