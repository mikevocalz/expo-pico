# expo-pico-spatial

Spatial mode helpers, container APIs, and runtime seams for PICO OS 6 Spatial SDK.

> Part of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family. See the repository [ARCHITECTURE.md](https://github.com/mikevocalz/expo-pico/blob/main/ARCHITECTURE.md) for cross-package design rationale.

## Status

- **Maturity:** alpha
- **PICO Spatial SDK linkage:** extension seam. Spatial anchor / container runtime methods throw `notImplementedError` until the PICO Spatial SDK AAR ships and is linked. The detection surface (`getSpaceState`, `getContainerType`, `getSpatialCapabilities`) reads BuildConfig mirror fields set by `expo-pico-core` and works today.
- **Platform:** Android only.
- **Runtime target:** PICO OS 6 in shared-space, full-space, or volume modes.

## Install

```bash
yarn add expo-pico-core expo-pico-spatial
```

## Configure

Spatial features are selected via `expo-pico-core` plugin options — this package only scaffolds the native seams. Enable the spatial modes + capability toggles you need:

```ts
// app.config.ts
export default {
  plugins: [
    [
      'expo-pico-core',
      {
        buildVariant: 'pico',
        xrMode: 'pico-swan', // use 'pico-os6' for PICO 4 / 4 Ultra
        appType: 'vr',
        spatialMode: 'shared-space', // or 'full-space', 'volume', 'windowed'
        defaultContainerMode: 'window-container', // or 'stage', 'none'
        handTracking: true,
        passthrough: true,
        sceneUnderstanding: true,
        boundary: true, // Phase D: XR_PICO_boundary_ext
        sceneMesh: true, // Phase D: distinct from sceneUnderstanding
      },
    ],
    'expo-pico-spatial',
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
} from 'expo-pico-spatial';

function logSpatialStatus() {
  console.log({
    space: getSpaceState(), // 'shared-space' | 'full-space' | 'unknown'
    container: getContainerType(), // 'window-container' | 'stage' | 'none'
    caps: getSpatialCapabilities(),
    sdk: getSpatialSdkVersion(), // null until Spatial SDK is linked
  });
}

// Extension seams — throw notImplementedError until SDK is wired.
try {
  await createSpatialAnchor({ position: [0, 0, -1], rotation: [0, 0, 0, 1] });
} catch (e) {
  console.warn('Anchor API is a seam:', e);
}
```

## API

| Function                            | Description                                                              |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `getSpaceState()`                   | Reports `shared-space` / `full-space` / `unknown`.                       |
| `getContainerType()`                | Reports the app's active container (`window-container` / `stage` / `none`). |
| `getSpatialCapabilities()`          | Flags for anchors, scene understanding, passthrough, hand-tracking, Spatial SDK availability. |
| `getSpatialSdkVersion()`            | Spatial SDK version, or `null` when not linked.                          |
| `createSpatialAnchor(pose)` *(seam)*       | Place a persistent spatial anchor at a pose. Throws until wired.    |
| `setWindowContainerProperties(props)` *(seam)* | Configure a floating WindowContainer's size / pinning. Throws until wired. |
| `requestFullSpace()` *(seam)*       | Transition from shared-space to full-space. Throws until wired.          |

Types: `PicoSpaceState`, `PicoContainerType`, `SpatialCapabilities`, `SpatialAnchorHandle`, `Pose3D`, `WindowContainerProperties`.

## Runtime diagnostics

```ts
import { getSpatialCapabilities } from 'expo-pico-spatial';
import { getPicoRuntimeInfo } from 'expo-pico-core';

const info = getPicoRuntimeInfo();
const caps = getSpatialCapabilities();

console.log({
  spatialMode: info.spatialMode, // from plugin option
  containerMode: info.containerMode,
  xrMode: info.xrMode,
  caps, // runtime-probed feature flags
});
```

## Limitations

- Anchor / container / space-transition runtime APIs are seams. The plugin correctly declares every relevant manifest feature (`pico.software.spatialanchor`, `pico.software.scene`, `pico.software.scenemesh`), but native runtime bindings require the PICO Spatial SDK AAR. Expect these to land in a future phase when the SDK surfaces stabilize publicly.
- `spatialMode: 'volume'` (Phase D) is the PICO OS 6 3D Volume container — the meta-data key is emitted as a best-known seam; verify against the PICO launcher when the Spatial SDK ships.

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)
- [ARCHITECTURE §15 — PICO Swan OS support](https://github.com/mikevocalz/expo-pico/blob/main/ARCHITECTURE.md#15-pico-swan-os-support-path-xrmode)
- [ARCHITECTURE §18 — Hardware capability declarations](https://github.com/mikevocalz/expo-pico/blob/main/ARCHITECTURE.md#18-hardware-capability-declarations-phase-c)
- [PICO Spatial SDK docs](https://developer.picoxr.com/document/spatial-sdk/)

## License

MIT
