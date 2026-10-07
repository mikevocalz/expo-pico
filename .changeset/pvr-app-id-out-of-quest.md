---
'@expo-pico/core': minor
---

`pvr.app.id` no longer reaches the Quest APK. Core used to write it to the main AndroidManifest so every flavor had it. It now goes to the flavors that can call PICO Platform Services: pico, dual and mobile (`android/app/src/mobile/AndroidManifest.xml`, created if missing). A copy left in main by an older prebuild is removed. A single-variant app (`buildVariant: 'mobile'`) still gets it in main, unless expo-horizon-core adds a quest flavor, in which case it goes to the mobile flavor. The opt-in `withPicoOpenXrLoader` routes `pvr.app.type=vr` the same way and no longer writes it to main. New helper: `withPicoFlavorMetaData`. The meta-data is now also written when only `platformService.picoAppId` is set, matching the `pico_app_id` string resource.
