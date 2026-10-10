---
'@expo-pico/core': major
---

No PICO app ID, no PICO build. Without `picoAppId` (or `platformService.picoAppId`) core adds no `pico` or `dual` flavor, no pico manifest, no `pvr.app.id`, no PICO Platform Service dependencies and no overlays, and prints one info line instead of the identity error. Comment the plugin entry out, with a placeholder ID, until you want a PICO build. The build gate that failed `pico`/`dual` builds with an empty ID is gone, and prebuild removes it from an existing `app/build.gradle`.

Core no longer declares the `quest` flavor or writes anything into it. `metaLayoutSdk`, `storeDeviceTargets`, `questRemovePermissions`, `questRemoveFeatures`, `questExcludeDependencies` and the quest copy of `viroRendererOverlay` moved to the `expo-horizon-core` plugin entry (`github:mikevocalz/expo-pico#release/horizon-core`), which owns the quest flavor for Quest and Meta VR Glasses. Passing one of the first five to `@expo-pico/core` fails prebuild with a message naming the entry they belong on. The Horizon BuildConfig fix for AGP 9 moved with them.
