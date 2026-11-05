---
'@expo-pico/core': patch
'@expo-pico/spatial': patch
'@expo-pico/account': patch
'@expo-pico/iap': patch
'@expo-pico/notifications': patch
'@expo-pico/rtc': patch
'@expo-pico/rooms': patch
'@expo-pico/subscription': patch
'@expo-pico/storage': patch
'@expo-pico/social': patch
'@expo-pico/achievements': patch
'@expo-pico/leaderboards': patch
---

Nitrogen output is regenerated with `nitrogen@1.0.0-alpha.nightly.120.g33ef045b96c0`, and the apps that consume it must install `react-native-nitro-modules` and `nitro-core` at that same exact version. The `.120` runtime passes Kotlin callbacks through JNI as `Callback` (margelo/nitro#2009), so the generated Android specs lose their private `*_cxx` listener bridges, and `JNICallback`, `JUInt64` and `JNIArrays` from `.100` are gone. Spec files, the JS API and the public Kotlin signatures that `Hybrid*` classes override are unchanged. Nitro V1 is still alpha-nightly; there is no stable 1.0 release. The `react-native-nitro-modules` and `nitro-core` peer ranges are now `>=1.0.0-alpha.nightly.120.g33ef045b96c0` instead of `*`, so an app on an older Nitro gets a peer warning at install instead of a missing `JCallback.hpp` at C++ compile time.
