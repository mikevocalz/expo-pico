---
'@expo-pico/spatial': minor
---

Add `openWindowContainer` / `closeWindowContainer` and `getLayoutBridgeStatus` on PICO Spatial SDK 6. The new `enableSpatialSdk` plugin option links `com.pico.spatial.core:core:6.1.9` into the pico/dual flavors. `getSpatialLayoutReadiness()` now reports a WindowContainer bridge as bound only when `SpatialBuild.isSpatialPlatform()` is true, so PICO OS 5 builds with the SDK linked no longer read as OS 6.
