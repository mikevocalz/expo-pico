---
'@expo-pico/core': patch
'@expo-pico/spatial': patch
'@expo-pico/account': patch
'@expo-pico/achievements': patch
'@expo-pico/iap': patch
'@expo-pico/leaderboards': patch
'@expo-pico/notifications': patch
'@expo-pico/rooms': patch
'@expo-pico/rtc': patch
'@expo-pico/social': patch
'@expo-pico/storage': patch
'@expo-pico/subscription': patch
'@expo-pico/template': patch
'@expo-pico/platform-service-common': patch
---

Make installed PICO packages self-contained for normal Android builds: release
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
