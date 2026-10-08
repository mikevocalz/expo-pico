---
'@expo-pico/core': patch
---

A `com.oculus.supportedDevices` list with `vrglasses` now derives `storeDeviceTargets` `quest3+`, the same as `quest3` or `quest3s`. Meta's port guide (2026-09-14) and manifest reference list `vrglasses` as a canonical identifier, so the example's quest flavor now declares `quest3|quest3s|vrglasses` on both `expo-horizon-core` and react-viro's `questSupportedDevices`.
