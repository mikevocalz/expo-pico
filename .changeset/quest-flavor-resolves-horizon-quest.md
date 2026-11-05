---
'@expo-pico/core': patch
---

Quest builds without a `picoAppId` now package expo-horizon-core's `quest` variant. The plugin wrote `missingDimensionStrategy "device", "mobile"` into `defaultConfig` for every `buildVariant: 'mobile'` app, and that value overrides the `quest` flavor expo-horizon-core adds in the same `device` dimension. `assembleQuestDebug` then packaged the mobile variant, `ExpoHorizon.isHorizonBuild` read `false`, and a Quest 3S ran the phone layout with no Layout SDK windows. The strategy now applies in `androidComponents.finalizeDsl` only when the app has no `device` dimension of its own, and a prebuild replaces the block older versions wrote.

The New Architecture flag guard (`skipActivityIdentityAssertionOnHostPause`) is now added to `MainApplication` whenever `@reactvision/react-viro` is a config plugin, not only when `xrMode` is a PICO mode. A quest-only app has react-viro's `VRActivity` too, and without the guard Enter XR on a Quest 3S crashed with `AssertionError: Pausing an activity that is not the current activity`.
