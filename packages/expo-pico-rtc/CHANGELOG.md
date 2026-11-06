# @expo-pico/rtc

## 2.0.0

### Patch Changes

- c32621e: Nitrogen output is regenerated with `nitrogen@1.0.0-alpha.nightly.120.g33ef045b96c0`, and the apps that consume it must install `react-native-nitro-modules` and `nitro-core` at that same exact version. The `.120` runtime passes Kotlin callbacks through JNI as `Callback` (margelo/nitro#2009), so the generated Android specs lose their private `*_cxx` listener bridges, and `JNICallback`, `JUInt64` and `JNIArrays` from `.100` are gone. Spec files, the JS API and the public Kotlin signatures that `Hybrid*` classes override are unchanged. Nitro V1 is still alpha-nightly; there is no stable 1.0 release. The `react-native-nitro-modules` and `nitro-core` peer ranges are now `>=1.0.0-alpha.nightly.120.g33ef045b96c0` instead of `*`, so an app on an older Nitro gets a peer warning at install instead of a missing `JCallback.hpp` at C++ compile time.
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
