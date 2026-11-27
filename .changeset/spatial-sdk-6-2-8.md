---
'@expo-pico/spatial': patch
---

`enableSpatialSdk` links PICO Spatial SDK 6.2.8 (`com.pico.spatial.core:core:6.2.8`, released 2026-11-11 on the Volcengine Maven) instead of 6.1.9, and the module compiles against 6.2.8. `SpatialContainerManager.openWindowContainer`/`closeWindowContainer`, `SpatialBuild` and `AttachmentPanelComponent`, which the WindowContainer bridge calls, are unchanged in 6.2.8. An `android/app/build.gradle` that an earlier release prebuilt keeps its runtime block, and the plugin now rewrites that block's SDK version instead of leaving it on 6.1.9 until `expo prebuild --clean`.
