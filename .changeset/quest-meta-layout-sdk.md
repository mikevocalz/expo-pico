---
'@expo-pico/core': minor
---

New `metaLayoutSdk` option links the Meta VR Layout SDK (`@metavr/layout-compat` and `@metavr/layout-window-compat`) into the `quest` flavor only. It writes the MetaVRX BOM and both React Native artifacts as `questImplementation`, keeps the SDK and its `horizonos.permission.MANAGE_APP_VOLUMETRIC_WINDOWS` permission out of every other flavor, gives those flavors empty stand-ins for the two packages the generated `PackageList` creates, and lists the SDK's library projects in `tools:overrideLibrary` so a phone flavor below minSdk 29 still builds. Off by default.
