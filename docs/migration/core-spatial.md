# Core + Spatial migration

This branch migrates @expo-pico/core and @expo-pico/spatial from Nitro HybridObjects to Expo Modules 2.0 and moves hot XR transforms/state into the shared Eskiu arm64 runtime.

Acceptance:

- expo-module-gradle-plugin with v2=true
- @ExpoModule/@JS native modules
- no public TypeScript API break
- Eskiu used for hot scalar/state transforms
- Viro-facing C ABI remains allocation-free
- mobile flavor remains no-op safe
