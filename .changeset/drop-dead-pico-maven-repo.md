---
'@expo-pico/core': patch
---

The project `build.gradle` no longer gets `https://developer.pico-interactive.com/maven`. The URL now answers 302 with a redirect to PICO's homepage, and no dependency resolved from the `com.pvr` and `com.pvr.platform` groups it was filtered to. Prebuilding over an existing `android/` directory removes the entry an earlier release wrote. The Volcengine repository for `com.pico.pps` and `com.pico` stays. The unused `PICO_SDK_GROUP`, `PICO_PLATFORM_SDK_GROUP`, `PICO_PLATFORM_SDK_VERSION` and `PICO_SPATIAL_SDK_VERSION` plugin constants are removed.
