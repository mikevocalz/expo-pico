# PICO Spatial SDK 6 layout bridge

## Why this update exists

The original `@expo-pico/spatial` bridge was scaffolded around the earlier PVR-era Spatial SDK and still probes `com.picovr.spatial.*` classes.

PICO's current public Spatial SDK 6.1.9 documents the newer `com.pico.spatial.*` API family, including:

- `WindowContainer` (planar or volumetric);
- `Subwindow`;
- `Augment`;
- `Toolbar`;
- `SpatialPopup`;
- `Stage`;
- `AttachmentPanelComponent` for Android View content;
- `SpatialNavigator` for container lifecycle.

This PR adds a modern runtime probe and a stable JavaScript layout contract without falsely claiming that the native operations are already bound.

## Readiness model

`getSpatialLayoutReadiness()` separates two questions:

1. Is the modern PICO Spatial SDK runtime present on the classpath/device?
2. Has `expo-pico` implemented the corresponding native bridge?

`nativeLayoutBridgeBound` is `true` only when all three hold:

- the WindowContainer open/close bridge is compiled into `PicoSpatialV2`;
- the PICO Spatial SDK (`com.pico.spatial.core:core:6.1.9`) is in the APK, via `enableSpatialSdk: true` on the `@expo-pico/spatial` plugin;
- `SpatialBuild.isSpatialPlatform()` returns `true` at runtime.

`getLayoutBridgeStatus()` returns `{ sdkLinked, spatialPlatform, reason, lastError }` so an app can show why the bridge is off. The `*RuntimePresent` flags also require `spatialPlatform`. Linking the SDK puts `AttachmentPanelComponent` on the classpath of a PICO OS 5 build, and class presence alone reported OS 6 there.

Subwindow, Augment, Toolbar and SpatialPopup are `@Composable`-only in the SDK and stay unbound when `nativeLayoutBridgeBound` is `true`.

That distinction prevents the current problem where "SDK class exists" could accidentally be treated as "feature works."

## Shared layout roles

The contract mirrors the portable Viro workspace:

| Role      | PICO target                |
| --------- | -------------------------- |
| master    | start/end Subwindow        |
| content   | planar WindowContainer     |
| inspector | start/end Subwindow        |
| accessory | Toolbar                    |
| popup     | SpatialPopup               |
| volume    | volumetric WindowContainer |
| immersive | Stage                      |

`Augment` and `AttachmentPanelComponent` are adapter-level alternatives for surfaces that need more flexible placement or React Native Android View hosting.

## Native implementation follow-up

Next native PR should:

1. link the public PICO Spatial SDK 6.x artifact through the Expo config plugin;
2. bind container open/close/update operations;
3. expose Subwindow/Augment/Toolbar/SpatialPopup presentation;
4. create a Fabric/Android View host through AttachmentPanelComponent;
5. map Stage lifecycle to the existing Viro/OpenXR launcher;
6. set `nativeLayoutBridgeBound=true` only after device/emulator validation.

The existing OS5/OpenXR path must remain available for PICO 4-class devices.
