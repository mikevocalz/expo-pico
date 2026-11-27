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
'@expo-pico/template': patch
---

Nitrogen output is regenerated with `nitrogen@1.0.0-alpha.nightly.138.g43e09c161101`, which replaces nightly.120 as the version apps must install for `react-native-nitro-modules` and `nitro-core`. The `react-native-nitro-modules` and `nitro-core` peer floors move to `>=1.0.0-alpha.nightly.138.g43e09c161101`, and the template app pins the same version. Between nightly.120 and nightly.138 margelo/nitro changed no spec syntax, JS API or runtime header. The regenerated Kotlin structs implement `equals()` and `hashCode()` without `java.util.Objects` or a boxed array (margelo/nitro#2057). Doubles now compare by bit pattern, so `NaN` equals `NaN` and `0.0` no longer equals `-0.0`. Swift, C++ and JS output is unchanged.
