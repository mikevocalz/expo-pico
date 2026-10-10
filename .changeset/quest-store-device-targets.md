---
'@expo-pico/core': minor
---

New `storeDeviceTargets` option on the `expo-horizon-core` plugin entry writes `com.meta.store.defaultDeviceTargets` into the quest flavor manifest's `<application>`. Meta uses it to set a build's initial Device Targeting in the Developer Dashboard, and `quest3+` covers the Quest 3 family, Meta VR Glasses and future devices. Without the option, a `com.oculus.supportedDevices` list that includes `quest3` or `quest3s` gives `quest3+` (`questpro+` or `quest2+` when it lists an older headset). Values are checked against Meta's documented specifiers (`quest2only`, `questproonly`, `quest3only`, `quest2+`, `questpro+`, `quest3+`, `questpro-`, joined with `|`) and anything else fails prebuild. `false` or `''` removes the entry. The pico, dual, mobile and main manifests never get it, and the quest manifest is never created just for this entry.
