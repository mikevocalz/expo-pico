# @expo-pico/spatial

## 2.0.0

### Minor Changes

- 53cc87a: Add `createSpatialShell`, the rail, main panel and detail panel layout contract (docs/adr/0001). It turns design tokens into the rail's Meta Layout SDK window spec (flush outside the main panel's left edge), the strip a PICO main window reserves for the rail, and the detail panel's launch size. `attachedWindowFrame`, `detailPanelCommand` and `detailPanelStatusAfter` are the pure placement and detail-panel rules.
- 9dd63e9: Add `openWindowContainer` / `closeWindowContainer` and `getLayoutBridgeStatus` on PICO Spatial SDK 6. The new `enableSpatialSdk` plugin option links `com.pico.spatial.core:core:6.1.9` into the pico/dual flavors. `getSpatialLayoutReadiness()` now reports a WindowContainer bridge as bound only when `SpatialBuild.isSpatialPlatform()` is true, so PICO OS 5 builds with the SDK linked no longer read as OS 6.

### Patch Changes

- c32621e: Nitrogen output is regenerated with `nitrogen@1.0.0-alpha.nightly.120.g33ef045b96c0`, and the apps that consume it must install `react-native-nitro-modules` and `nitro-core` at that same exact version. The `.120` runtime passes Kotlin callbacks through JNI as `Callback` (margelo/nitro#2009), so the generated Android specs lose their private `*_cxx` listener bridges, and `JNICallback`, `JUInt64` and `JNIArrays` from `.100` are gone. Spec files, the JS API and the public Kotlin signatures that `Hybrid*` classes override are unchanged. Nitro V1 is still alpha-nightly; there is no stable 1.0 release. The `react-native-nitro-modules` and `nitro-core` peer ranges are now `>=1.0.0-alpha.nightly.120.g33ef045b96c0` instead of `*`, so an app on an older Nitro gets a peer warning at install instead of a missing `JCallback.hpp` at C++ compile time.
- e962042: PICO-only permissions and features no longer reach the Quest and mobile APKs. `com.picovr.payment.BILLING` (iap, subscription), `com.picovr.platform.permission.SOCIAL` (rooms, social) and the spatial `pico.software.*` features used to be written to the main AndroidManifest, which every flavor merges. They now go to the pico (and dual) flavor manifest through core's new `withPicoFlavorPermission` / `withPicoFlavorFeature` helpers, and a re-run of prebuild removes copies an older prebuild left in main. Apps with `buildVariant: 'mobile'` have no pico flavor and keep the entries in main. These packages now need `@expo-pico/core` 1.1.0 or newer.
- dd6adb8: `SpatialWindowSpec` takes an optional `windowBackgroundColor`, passed through to Meta's `<SpatialWindow>`. Without it, a Layout SDK window paints the app theme's `android:windowBackground` behind its content. In an Expo app that is the white splash background, and on a Quest 3S it showed as a thin light arc at each rounded corner of the rail. Set it to the content's own background color.
- eae9f76: Make installed PICO packages self-contained for normal Android builds: release
  the compiled Eskiu runtime, declare config-plugin runtime dependencies, align
  sibling Core peer ranges with the shipped version, and resolve the doctor's
  Expo configuration loader through the consuming app.

  Preserve starter app commands and development dependencies in release branches.
  Start the renderer-free template as a native panel, with an explicit immersive
  configuration recipe and registered PICO app identity. Verify packed packages
  in fresh npm and isolated pnpm projects, including repeated clean prebuilds and
  a native PICO APK build without a custom compiler or local AAR provisioning.

  Check installed Viro native archives before Gradle starts, including hash
  verification when the renderer release supplies a paired-artifact manifest.
  Report unimplemented XR methods accurately instead of asking for SDK archives
  that cannot enable them.

- Updated dependencies [53f12cb]
- Updated dependencies [5cda191]
- Updated dependencies [dbbc8a7]
- Updated dependencies [f3a9511]
- Updated dependencies [53cc87a]
- Updated dependencies [d44e9fb]
- Updated dependencies [f63977a]
- Updated dependencies [c32621e]
- Updated dependencies [b1dcf09]
- Updated dependencies [9787b69]
- Updated dependencies [e962042]
- Updated dependencies [905365c]
- Updated dependencies [f304f15]
- Updated dependencies [110feca]
- Updated dependencies [38f5356]
- Updated dependencies [16f6c92]
- Updated dependencies [32ed3d5]
- Updated dependencies [0cea78f]
- Updated dependencies [29c4a8a]
- Updated dependencies [6a079be]
- Updated dependencies [a6423a2]
- Updated dependencies [0fad7d5]
- Updated dependencies [eae9f76]
- Updated dependencies [a12c25c]
  - @expo-pico/core@2.0.0
  - @expo-pico/platform-service-common@2.0.0

## 1.0.0

### Patch Changes

- Updated dependencies [f410e49]
  - @expo-pico/core@1.0.0
  - @expo-pico/platform-service-common@1.0.0
